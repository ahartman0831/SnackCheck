-- Controlled fixtures only. Executed in disposable CI; every change rolls back.
begin;
select plan(10);

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


insert into auth.users (id, aud, role) values
 ('79000000-0000-4000-8000-000000000001','authenticated','authenticated'),
 ('79000000-0000-4000-8000-000000000002','authenticated','authenticated');
insert into public.admin_members (user_id, role, active) values
 ('79000000-0000-4000-8000-000000000001','REGULATORY_ADMIN',true),
 ('79000000-0000-4000-8000-000000000002','REGULATORY_ADMIN',true);
create temporary table release_rehearsal_values as
select ruleset_hash, reviewed_at from public.rulesets
where id='33333333-3333-3333-3333-333333333333';
grant select on release_rehearsal_values to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','79000000-0000-4000-8000-000000000001',true);
select lives_ok(
 $$select public.admin_review_ruleset('33333333-3333-3333-3333-333333333333',
 (select ruleset_hash from release_rehearsal_values), 'https://example.test/disposable-review', repeat('a',64), 'release-rehearsal-review')$$,
 'a fixture regulatory reviewer records the exact draft hash'
);
reset role;
update release_rehearsal_values set reviewed_at=(select reviewed_at from public.rulesets where id='33333333-3333-3333-3333-333333333333');
set local role authenticated;
select throws_ok(
 $$select public.admin_publish_ruleset('33333333-3333-3333-3333-333333333333',
 repeat('0',64),(select reviewed_at from release_rehearsal_values),'release-rehearsal-stale')$$,
 '40001','ruleset changed; refresh before publishing','stale approval is rejected even for an authorized reviewer'
);
select set_config('request.jwt.claim.sub','79000000-0000-4000-8000-000000000002',true);
select lives_ok(
 $$select public.admin_publish_ruleset('33333333-3333-3333-3333-333333333333',
 (select ruleset_hash from release_rehearsal_values),(select reviewed_at from release_rehearsal_values),'release-rehearsal-publish')$$,
 'a separate fixture administrator can publish the reviewed version'
);
reset role;
select is((select count(*)::int from public.current_published_arizona_ruleset()),1,'published rules are available to the public projection');
select is((select count(*)::int from public.admin_audit_log where request_id in ('release-rehearsal-review','release-rehearsal-publish')),2,'both regulatory actions are audited');
set local role authenticated;
select lives_ok(
 $$select public.admin_review_catalog_candidate('72000000-0000-4000-8000-000000000001','2026-08-31T12:00:00Z','QUEUE','controlled release rehearsal','release-rehearsal-queue')$$,
 'fixture candidate can enter review'
);
reset role;
alter table release_rehearsal_values add column candidate_updated_at timestamptz;
update release_rehearsal_values set candidate_updated_at=(select updated_at from public.catalog_source_records where id='72000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok(
 $$select public.admin_promote_catalog_candidate('72000000-0000-4000-8000-000000000001',
 (select candidate_updated_at from release_rehearsal_values), jsonb_build_object(
 'brand','Fixture Foods','name','Oat Bites','slug','fixture-oat-bites',
 'verifiedIngredientText','Oats, salt','normalizedIngredientText','oats salt',
 'formulationHash',repeat('1',64),
 'ingredients','[{"ordinal":0,"raw":"Oats","normalized":"oats","parentOrdinal":null,"presenceKind":"DECLARED"},{"ordinal":1,"raw":"salt","normalized":"salt","parentOrdinal":null,"presenceKind":"DECLARED"}]'::jsonb,
 'evidenceUrl','https://fixturefoods.example/oat-bites','evidenceTitle','Controlled fixture evidence, not a real product',
 'observedAt',now(),'individuallyPackaged',true,
 'evaluationResult',jsonb_build_object('ingredientStatus','PASS','applicabilityStatus','APPLIES',
 'localPolicyStatus','NOT_REQUESTED','rulesetHash',(select ruleset_hash from release_rehearsal_values),
 'formulationHash',repeat('1',64),'evaluatedAt',now(),'qualityFlags','[]'::jsonb,
 'matchedRules','[]'::jsonb,'engineVersion','release-test-fixture','explanation','{}'::jsonb)
 ),'release-rehearsal-promote')$$,
 'reviewed fixture promotes through the guarded transaction with versioned evaluation'
);
set local role anon;
select is((select count(*)::int from public.list_approved_public_products(null,null,24,0)),1,'eligible fixture appears in the anonymous approved projection');
reset role;
update public.products set formulation_conflict=true where gtin14='00012345678905';
set local role anon;
select is((select count(*)::int from public.list_approved_public_products(null,null,24,0)),0,'a later evidence conflict immediately removes public approval');
reset role;
select is((select count(*)::int from public.rule_aliases where regulatory_source_id='a0390000-0000-4000-8000-000000000001' and not enabled and reviewed_at is null),28,'rehearsal does not implicitly approve proposed aliases');
select * from finish();
rollback;
