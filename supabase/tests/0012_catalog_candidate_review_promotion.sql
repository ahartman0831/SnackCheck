begin;
select plan(21);

select has_column('public', 'catalog_source_records', 'reviewed_at', 'candidate review timestamp exists');
select has_function('public', 'admin_review_catalog_candidate', array['uuid','timestamp with time zone','text','text','text'], 'candidate review transaction exists');
select has_function('public', 'admin_promote_catalog_candidate', array['uuid','timestamp with time zone','jsonb','text'], 'candidate promotion transaction exists');
select function_privs_are('public', 'admin_review_catalog_candidate', array['uuid','timestamp with time zone','text','text','text'], 'anon', array[]::text[], 'anonymous users cannot review candidates');
select function_privs_are('public', 'admin_promote_catalog_candidate', array['uuid','timestamp with time zone','jsonb','text'], 'anon', array[]::text[], 'anonymous users cannot promote candidates');

insert into public.catalog_import_batches (
  id, provider, dataset_release, source_url, license_identifier, file_sha256,
  file_byte_size, mode, status, parser_version, normalizer_version, completed_at
) values (
  '71000000-0000-4000-8000-000000000001', 'USDA_FDC', 'test',
  'https://fdc.nal.usda.gov/download-datasets/', 'CC0-1.0', repeat('a', 64),
  1, 'APPLY', 'COMPLETED', 'test', 'test', now()
);
insert into public.catalog_source_records (
  id, import_batch_id, provider, external_record_id, source_version,
  source_record_sha256, source_gtin, normalized_gtin14, brand, product_name,
  category, raw_ingredient_text, normalized_ingredient_text, ingredient_text_sha256,
  market_country, source_url, source_reference, license_identifier, screen_status,
  engine_version, ruleset_hash, candidate_state, updated_at
) values
  ('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','USDA_FDC','one','test',repeat('b',64),'012345678905','00012345678905','Fixture Foods','Oat Bites','Snacks','Oats, salt','oats salt',repeat('c',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/one','FDC one','CC0-1.0','PASS','test',repeat('d',64),'SCREENED_PASS','2026-08-31T12:00:00Z'),
  ('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','USDA_FDC','two','test',repeat('e',64),'012345678905','00012345678905','Fixture Foods','Oat Bites','Snacks','Oats, salt, cocoa','oats salt cocoa',repeat('f',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/two','FDC two','CC0-1.0','PASS','test',repeat('d',64),'SCREENED_PASS','2026-08-31T12:00:00Z');

set local role authenticated;
select set_config('request.jwt.claim.sub', '73000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.admin_review_catalog_candidate('72000000-0000-4000-8000-000000000001','2026-08-31T12:00:00Z','QUEUE','','request-not-admin')$$,
  '42501', 'active reviewer access is required', 'a non-member cannot queue a candidate'
);

reset role;
insert into auth.users (id, aud, role) values ('73000000-0000-4000-8000-000000000001','authenticated','authenticated');
insert into public.admin_members (user_id, role, active) values ('73000000-0000-4000-8000-000000000001','REVIEWER',true);
set local role authenticated;
select throws_ok(
  $$select public.admin_review_catalog_candidate('72000000-0000-4000-8000-000000000001','2026-08-31T12:00:01Z','QUEUE','','request-stale-review')$$,
  '40001', 'catalog candidate changed; refresh before deciding', 'stale review attempts fail'
);
select lives_ok(
  $$select public.admin_review_catalog_candidate('72000000-0000-4000-8000-000000000001','2026-08-31T12:00:00Z','QUEUE','reviewed source lead','request-queue-candidate')$$,
  'an active reviewer can queue a candidate'
);

reset role;
select is((select candidate_state from public.catalog_source_records where id='72000000-0000-4000-8000-000000000001'),'REVIEW_QUEUED','queue transition is saved');
select is((select count(*) from public.admin_audit_log where entity_id='72000000-0000-4000-8000-000000000001'),1::bigint,'queue transition is audited');
create temporary table promotion_versions (candidate_id uuid primary key, updated_at timestamptz);
insert into promotion_versions select id, updated_at from public.catalog_source_records where id='72000000-0000-4000-8000-000000000001';
grant select on promotion_versions to authenticated;

set local role authenticated;
select throws_ok(
  $$select public.admin_promote_catalog_candidate('72000000-0000-4000-8000-000000000001',(select updated_at from promotion_versions where candidate_id='72000000-0000-4000-8000-000000000001'),jsonb_build_object('brand','Fixture Foods','name','Oat Bites','slug','fixture-oat-bites','verifiedIngredientText','Oats, salt','normalizedIngredientText','oats salt','formulationHash',repeat('1',64),'ingredients','[{"ordinal":0,"raw":"Oats","normalized":"oats","parentOrdinal":null,"presenceKind":"DECLARED"}]'::jsonb,'evidenceUrl','https://fdc.nal.usda.gov/product','evidenceTitle','USDA record','observedAt','2026-08-31T12:00:00Z','individuallyPackaged',true),'request-bad-evidence')$$,
  '22023', 'verified manufacturer evidence and product fields are required', 'provider evidence cannot verify its own candidate'
);
select lives_ok(
  $$select public.admin_promote_catalog_candidate('72000000-0000-4000-8000-000000000001',(select updated_at from promotion_versions where candidate_id='72000000-0000-4000-8000-000000000001'),jsonb_build_object('brand','Fixture Foods','name','Oat Bites','slug','fixture-oat-bites','verifiedIngredientText','Oats, salt','normalizedIngredientText','oats salt','formulationHash',repeat('1',64),'ingredients','[{"ordinal":0,"raw":"Oats","normalized":"oats","parentOrdinal":null,"presenceKind":"DECLARED"}]'::jsonb,'evidenceUrl','https://fixturefoods.example/oat-bites','evidenceTitle','Fixture Foods Oat Bites ingredients','observedAt','2026-08-31T12:00:00Z','individuallyPackaged',true),'request-promote-one')$$,
  'manufacturer-verified evidence can promote a queued candidate'
);

reset role;
select is((select candidate_state from public.catalog_source_records where id='72000000-0000-4000-8000-000000000001'),'PROMOTED','promoted candidate records its terminal state');
select is((select count(*) from public.products where gtin14='00012345678905'),1::bigint,'promotion creates one canonical product');
select is((select verification_status::text from public.formulations where product_id=(select id from public.products where gtin14='00012345678905')),'VERIFIED','independent manufacturer evidence produces a verified formulation');
select is((select source_type::text from public.formulation_sources where formulation_id=(select canonical_formulation_id from public.catalog_source_records where id='72000000-0000-4000-8000-000000000001')),'MANUFACTURER','the manufacturer source is preserved');
select is((select count(*) from public.list_approved_public_products(null,null,24,0)),0::bigint,'promotion alone cannot bypass the published approved projection');

insert into promotion_versions select id, updated_at from public.catalog_source_records where id='72000000-0000-4000-8000-000000000002';
set local role authenticated;
select lives_ok(
  $$select public.admin_review_catalog_candidate('72000000-0000-4000-8000-000000000002',(select updated_at from promotion_versions where candidate_id='72000000-0000-4000-8000-000000000002'),'QUEUE','possible changed formulation','request-queue-two')$$,
  'a second formulation candidate can enter review'
);
reset role;
update promotion_versions set updated_at=(select updated_at from public.catalog_source_records where id='72000000-0000-4000-8000-000000000002') where candidate_id='72000000-0000-4000-8000-000000000002';
set local role authenticated;
select lives_ok(
  $$select public.admin_promote_catalog_candidate('72000000-0000-4000-8000-000000000002',(select updated_at from promotion_versions where candidate_id='72000000-0000-4000-8000-000000000002'),jsonb_build_object('brand','Fixture Foods','name','Oat Bites','slug','fixture-oat-bites','verifiedIngredientText','Oats, salt, cocoa','normalizedIngredientText','oats salt cocoa','formulationHash',repeat('2',64),'ingredients','[{"ordinal":0,"raw":"Oats","normalized":"oats","parentOrdinal":null,"presenceKind":"DECLARED"}]'::jsonb,'evidenceUrl','https://fixturefoods.example/oat-bites-new','evidenceTitle','Changed Oat Bites ingredients','observedAt','2026-08-31T12:00:00Z','individuallyPackaged',true),'request-promote-two')$$,
  'a changed verified formulation is recorded without replacing the active version'
);
reset role;
select is((select count(*) from public.data_conflicts where product_id=(select id from public.products where gtin14='00012345678905') and status='OPEN'),1::bigint,'a changed formulation creates one open conflict');
select is((select count(*) from public.formulations where product_id=(select id from public.products where gtin14='00012345678905') and active=true),1::bigint,'the trusted active formulation is not replaced');

select * from finish();
rollback;
