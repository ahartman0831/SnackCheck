begin;
select plan(10);

select has_function('public', 'queue_catalog_candidate_shortlist', array['uuid[]','jsonb','text'], 'bounded shortlist queue function exists');
select function_privs_are('public', 'queue_catalog_candidate_shortlist', array['uuid[]','jsonb','text'], 'anon', array[]::text[], 'anonymous users cannot queue a shortlist');
select function_privs_are('public', 'queue_catalog_candidate_shortlist', array['uuid[]','jsonb','text'], 'authenticated', array[]::text[], 'ordinary authenticated users cannot queue a shortlist');

insert into public.catalog_import_batches (
  id, provider, dataset_release, source_url, license_identifier, file_sha256,
  file_byte_size, mode, status, parser_version, normalizer_version, completed_at
) values (
  '81000000-0000-4000-8000-000000000001', 'USDA_FDC', 'test',
  'https://fdc.nal.usda.gov/download-datasets/', 'CC0-1.0', repeat('a', 64),
  1, 'APPLY', 'COMPLETED', 'test', 'test', now()
);
insert into public.catalog_source_records (
  id, import_batch_id, provider, external_record_id, source_version,
  source_record_sha256, source_gtin, normalized_gtin14, brand, product_name,
  category, raw_ingredient_text, normalized_ingredient_text, ingredient_text_sha256,
  market_country, source_url, source_reference, license_identifier, screen_status,
  quality_flags, engine_version, ruleset_hash, candidate_state, discontinued
) values
  ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','USDA_FDC','one','test',repeat('b',64),'012345678905','00012345678905','Fixture Foods','Oat Bites','Snacks','Oats, salt','oats salt',repeat('c',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/one','FDC one','CC0-1.0','PASS','[]','test',repeat('d',64),'SCREENED_PASS',false),
  ('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000001','USDA_FDC','two','test',repeat('e',64),'012345678912','00012345678912','Fixture Foods','Cereal','Cereal','Corn, salt','corn salt',repeat('f',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/two','FDC two','CC0-1.0','PASS','[]','test',repeat('d',64),'SCREENED_PASS',false),
  ('82000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000001','USDA_FDC','three','test',repeat('1',64),'012345678929','00012345678929','Fixture Foods','Warning','Cereal','Corn, salt','corn salt',repeat('2',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/three','FDC three','CC0-1.0','PASS','["PARSER_WARNING"]','test',repeat('d',64),'SCREENED_PASS',false),
  ('82000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000001','USDA_FDC','four','test',repeat('3',64),'012345678936','00012345678936','Fixture Foods','Failed','Candy','Sugar','sugar',repeat('4',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/four','FDC four','CC0-1.0','FAIL','[]','test',repeat('d',64),'SCREENED_FAIL',false);

update public.catalog_source_records
set classroom_relevance_policy_version = 'classroom-use-v2',
    classroom_relevance_score = 80,
    classroom_relevance_tier = 'HIGH',
    catalog_automation_route = 'AUTO_EVIDENCE',
    classroom_relevance_reasons = '["CLASSROOM_CATEGORY_SNACKS"]'::jsonb,
    classroom_relevance_assessed_at = now()
where id in (
  '82000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000002'
);

set local role service_role;
select throws_ok(
  $$select public.queue_catalog_candidate_shortlist(array['82000000-0000-4000-8000-000000000001'::uuid],jsonb_build_object('algorithmVersion','classroom-use-v2','targetCount',1,'selectionHash',repeat('a',64),'groupCounts','{"SNACKS":1}'::jsonb),'WRONG')$$,
  '22023', 'exact staging shortlist confirmation is required', 'exact confirmation is required'
);
select throws_ok(
  $$select public.queue_catalog_candidate_shortlist(array['82000000-0000-4000-8000-000000000003'::uuid],jsonb_build_object('algorithmVersion','classroom-use-v2','targetCount',1,'selectionHash',repeat('a',64),'groupCounts','{"BREAKFAST":1}'::jsonb),'QUEUE_CATALOG_SHORTLIST_TO_STAGING')$$,
  '40001', 'shortlist contains an ineligible or changed candidate', 'quality warnings cannot enter the shortlist'
);
select throws_ok(
  $$select public.queue_catalog_candidate_shortlist(array['82000000-0000-4000-8000-000000000004'::uuid],jsonb_build_object('algorithmVersion','classroom-use-v2','targetCount',1,'selectionHash',repeat('a',64),'groupCounts','{"TREATS":1}'::jsonb),'QUEUE_CATALOG_SHORTLIST_TO_STAGING')$$,
  '40001', 'shortlist contains an ineligible or changed candidate', 'failed screens cannot enter the shortlist'
);
select lives_ok(
  $$select public.queue_catalog_candidate_shortlist(array['82000000-0000-4000-8000-000000000001'::uuid,'82000000-0000-4000-8000-000000000002'::uuid],jsonb_build_object('algorithmVersion','classroom-use-v2','targetCount',2,'selectionHash',repeat('b',64),'groupCounts','{"SNACKS":1,"BREAKFAST":1}'::jsonb),'QUEUE_CATALOG_SHORTLIST_TO_STAGING')$$,
  'service role can queue an eligible bounded shortlist'
);

reset role;
select is((select count(*) from public.catalog_source_records where candidate_state='REVIEW_QUEUED'),2::bigint,'eligible candidates are queued');
select is((select count(*) from public.admin_audit_log where action='CATALOG_CANDIDATE_SHORTLIST_QUEUED'),2::bigint,'every shortlist transition is audited');
select is((select count(*) from public.products),0::bigint,'shortlisting cannot create public products');

select * from finish();
rollback;
