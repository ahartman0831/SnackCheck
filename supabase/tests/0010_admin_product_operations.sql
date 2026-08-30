begin;
select plan(15);

select has_function('public', 'admin_create_product_from_submission', array['uuid','timestamp with time zone','text','text','text','text','text','text','boolean','text','text','text','jsonb','text'], 'audited product creation exists');
select has_function('public', 'admin_merge_products', array['uuid','uuid','timestamp with time zone','timestamp with time zone','text'], 'audited product merge exists');
select function_privs_are('public', 'admin_create_product_from_submission', array['uuid','timestamp with time zone','text','text','text','text','text','text','boolean','text','text','text','jsonb','text'], 'anon', array[]::text[], 'anonymous users cannot create products');
select function_privs_are('public', 'admin_merge_products', array['uuid','uuid','timestamp with time zone','timestamp with time zone','text'], 'anon', array[]::text[], 'anonymous users cannot merge products');

insert into public.evidence_assets (id, bucket, storage_path, media_type, byte_size, sha256, exif_stripped)
values ('61000000-0000-4000-8000-000000000001', 'submission-sanitized', 'test/product.jpg', 'image/jpeg', 100, repeat('a', 64), true);
insert into public.submissions (id, normalized_gtin14, scanned_identifier, evidence_asset_id, status, corrected_text, confirmed_formulation_hash, confirmed_at, updated_at)
values ('62000000-0000-4000-8000-000000000001', '00012345678905', '012345678905', '61000000-0000-4000-8000-000000000001', 'APPROVED', 'Oats, salt', repeat('b', 64), now(), '2026-08-30T12:00:00Z');

set local role authenticated;
select set_config('request.jwt.claim.sub', '63000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.admin_create_product_from_submission('62000000-0000-4000-8000-000000000001','2026-08-30T12:00:00Z','Test','Oats','','','Snacks','test-oats',true,'GTIN_14','00012345678905','oats, salt','[{"ordinal":0,"raw":"Oats","normalized":"oats","parentOrdinal":null,"presenceKind":"DECLARED"}]','request-unauthorized')$$,
  '42501', 'active reviewer access is required', 'non-members cannot create products'
);

reset role;
insert into auth.users (id, aud, role) values ('63000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated');
insert into public.admin_members (user_id, role, active) values ('63000000-0000-4000-8000-000000000001', 'REVIEWER', true);
set local role authenticated;
select lives_ok(
  $$select public.admin_create_product_from_submission('62000000-0000-4000-8000-000000000001','2026-08-30T12:00:00Z','Test','Oats','','','Snacks','test-oats',true,'GTIN_14','00012345678905','oats, salt','[{"ordinal":0,"raw":"Oats","normalized":"oats","parentOrdinal":null,"presenceKind":"DECLARED"}]','request-create-product')$$,
  'a reviewer can create a product from approved package evidence'
);

reset role;
select is((select brand from public.products where slug = 'test-oats'), 'Test', 'the product is created');
select is((select verification_status::text from public.formulations where product_id = (select id from public.products where slug = 'test-oats')), 'PACKAGE_VERIFIED', 'the reviewed formulation is package verified');
select is((select action from public.admin_audit_log where entity_id = (select id from public.products where slug = 'test-oats')), 'PRODUCT_CREATED_FROM_SUBMISSION', 'product creation is audited');

insert into public.submissions (id, normalized_gtin14, scanned_identifier, evidence_asset_id, status, corrected_text, confirmed_formulation_hash, confirmed_at, updated_at)
values ('62000000-0000-4000-8000-000000000002', '00012345678905', '012345678905', '61000000-0000-4000-8000-000000000001', 'APPROVED', 'Oats, salt', repeat('c', 64), now(), '2026-08-30T12:00:00Z');
set local role authenticated;
select throws_ok(
  $$select public.admin_create_product_from_submission('62000000-0000-4000-8000-000000000002','2026-08-30T12:00:00Z','Duplicate','Oats','','','','duplicate-oats',true,'GTIN_14','00012345678905','oats, salt','[]','request-duplicate-product')$$,
  '23505', 'that barcode already belongs to a product', 'duplicate barcodes are blocked'
);

reset role;
insert into public.products (id, brand, name, slug, updated_at)
values ('64000000-0000-4000-8000-000000000001', 'Canonical', 'Oats', 'canonical-oats', '2026-08-30T12:00:00Z');
create temporary table product_merge_test_values (
  source_id uuid not null,
  source_updated_at timestamptz not null
);
insert into product_merge_test_values
select id, updated_at from public.products where slug = 'test-oats';
grant select on product_merge_test_values to authenticated;
set local role authenticated;
select lives_ok(
  $$select public.admin_merge_products((select source_id from product_merge_test_values),'64000000-0000-4000-8000-000000000001',(select source_updated_at from product_merge_test_values),'2026-08-30T12:00:00Z','request-merge-product')$$,
  'a reviewer can merge a conflict-free duplicate'
);

reset role;
select is((select active from public.products where slug = 'test-oats'), false, 'the duplicate becomes inactive');
select is((select to_product_id from public.product_redirects where from_slug = 'test-oats'), '64000000-0000-4000-8000-000000000001'::uuid, 'the old slug redirects to the canonical product');
select is((select product_id from public.formulations where ingredient_text_sha256 = repeat('b', 64)), '64000000-0000-4000-8000-000000000001'::uuid, 'formulation evidence moves to the canonical product');
select is((select action from public.admin_audit_log where entity_id = '64000000-0000-4000-8000-000000000001'), 'PRODUCT_MERGED', 'the merge is audited');

select * from finish();
rollback;
