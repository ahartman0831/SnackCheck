begin;
select plan(11);

insert into public.catalog_import_batches (
  id, provider, dataset_release, source_url, license_identifier, file_sha256,
  file_byte_size, mode, status, parser_version, normalizer_version, completed_at
) values (
  '91000000-0000-4000-8000-000000000001', 'USDA_FDC', 'test',
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
  ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','USDA_FDC','one','test',repeat('b',64),'012345678905','00012345678905','Fixture Foods','Pretzel snack packs','Chips, Pretzels & Snacks','Wheat, salt','wheat salt',repeat('c',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/one','FDC one','CC0-1.0','PASS','[]','test',repeat('d',64),'SCREENED_PASS',false),
  ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','USDA_FDC','two','test',repeat('e',64),'012345678912','00012345678912','Fixture Foods','Pure honey','Honey','Honey','honey',repeat('f',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/two','FDC two','CC0-1.0','PASS','[]','test',repeat('d',64),'REVIEW_QUEUED',false),
  ('92000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000001','USDA_FDC','three','test',repeat('1',64),'012345678929','00012345678929','Fixture Foods','Chocolate snack bar','Snack, Energy & Granola Bars','Unknown flavor','unknown flavor',repeat('2',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/three','FDC three','CC0-1.0','VERIFY','[]','test',repeat('d',64),'SCREENED_VERIFY',false);


set local role service_role;
select throws_ok($test$select public.apply_catalog_relevance_assessments(jsonb_build_array(jsonb_build_object('id','92000000-0000-4000-8000-000000000001','version','classroom-use-v3','group','SNACKS','score',80,'tier','HIGH','route','AUTO_EVIDENCE','reasons',jsonb_build_array('SOURCE_CATEGORY_PRODUCT_FORMAT_CONFIRMED'))), jsonb_build_object('algorithmVersion','classroom-use-v9','assessedCount',1,'selectionHash',repeat('b',64),'corpusHash',repeat('b',64),'runId','94000000-0000-4000-8000-000000000001','batchIndex',0,'batchCount',1), 'APPLY_CLASSROOM_RELEVANCE_TO_STAGING')$test$, '22023', 'valid relevance run metadata is required', 'unknown policy versions are rejected');
select throws_ok($test$select public.apply_catalog_relevance_assessments(jsonb_build_array(jsonb_build_object('id','92000000-0000-4000-8000-000000000001','version','classroom-use-v2','group','SNACKS','score',80,'tier','HIGH','route','AUTO_EVIDENCE','reasons',jsonb_build_array('SOURCE_CATEGORY_PRODUCT_FORMAT_CONFIRMED'))), jsonb_build_object('algorithmVersion','classroom-use-v3','assessedCount',1,'selectionHash',repeat('b',64),'corpusHash',repeat('b',64),'runId','94000000-0000-4000-8000-000000000001','batchIndex',0,'batchCount',1), 'APPLY_CLASSROOM_RELEVANCE_TO_STAGING')$test$, '22023', 'every relevance assessment must be valid', 'mixed assessment and run versions are rejected');
select lives_ok($test$select public.apply_catalog_relevance_assessments(jsonb_build_array(jsonb_build_object('id','92000000-0000-4000-8000-000000000001','version','classroom-use-v3','group','SNACKS','score',80,'tier','HIGH','route','AUTO_EVIDENCE','reasons',jsonb_build_array('SOURCE_CATEGORY_PRODUCT_FORMAT_CONFIRMED'))), jsonb_build_object('algorithmVersion','classroom-use-v3','assessedCount',1,'selectionHash',repeat('b',64),'corpusHash',repeat('b',64),'runId','94000000-0000-4000-8000-000000000001','batchIndex',0,'batchCount',1), 'APPLY_CLASSROOM_RELEVANCE_TO_STAGING')$test$, 'v3 assessment succeeds');
select is((public.apply_catalog_relevance_assessments(jsonb_build_array(jsonb_build_object('id','92000000-0000-4000-8000-000000000001','version','classroom-use-v3','group','SNACKS','score',80,'tier','HIGH','route','AUTO_EVIDENCE','reasons',jsonb_build_array('SOURCE_CATEGORY_PRODUCT_FORMAT_CONFIRMED'))), jsonb_build_object('algorithmVersion','classroom-use-v3','assessedCount',1,'selectionHash',repeat('b',64),'corpusHash',repeat('b',64),'runId','94000000-0000-4000-8000-000000000001','batchIndex',0,'batchCount',1), 'APPLY_CLASSROOM_RELEVANCE_TO_STAGING')->>'idempotent')::boolean,true,'v3 assessment replay is idempotent');
select throws_ok($test$select public.queue_catalog_candidate_shortlist(array['92000000-0000-4000-8000-000000000001'::uuid], jsonb_build_object('algorithmVersion','classroom-use-v2','targetCount',1,'selectionHash',repeat('b',64),'runId','94000000-0000-4000-8000-000000000002','groupCounts','{"SNACKS":1}'::jsonb), 'QUEUE_CATALOG_SHORTLIST_TO_STAGING')$test$, '40001', 'shortlist contains an ineligible or changed candidate', 'v2 cannot queue a v3 assessment');
select lives_ok($test$select public.queue_catalog_candidate_shortlist(array['92000000-0000-4000-8000-000000000001'::uuid], jsonb_build_object('algorithmVersion','classroom-use-v3','targetCount',1,'selectionHash',repeat('b',64),'runId','94000000-0000-4000-8000-000000000002','groupCounts','{"SNACKS":1}'::jsonb), 'QUEUE_CATALOG_SHORTLIST_TO_STAGING')$test$, 'v3 high relevance candidate can be queued');
select is((public.queue_catalog_candidate_shortlist(array['92000000-0000-4000-8000-000000000001'::uuid], jsonb_build_object('algorithmVersion','classroom-use-v3','targetCount',1,'selectionHash',repeat('b',64),'runId','94000000-0000-4000-8000-000000000002','groupCounts','{"SNACKS":1}'::jsonb), 'QUEUE_CATALOG_SHORTLIST_TO_STAGING')->>'idempotent')::boolean,true,'v3 shortlist replay is idempotent');
select lives_ok($test$select public.begin_catalog_evidence_run(
 jsonb_build_object('runId','94000000-0000-4000-8000-000000000003','collectorVersion','catalog-evidence-v1','sourcePolicyVersion','evidence-source-v1','selectionHash',repeat('1',64),'maxRequestsPerCandidate',1,'maxRequestsPerRun',1,'maxResponseBytes',250000),
 array['92000000-0000-4000-8000-000000000001'::uuid], 'COLLECT_CATALOG_EVIDENCE_TO_STAGING')$test$, 'v3 candidate can enter a bounded evidence run');
reset role;
select is((select count(*) from public.catalog_evidence_run_candidates where run_id='94000000-0000-4000-8000-000000000003'),1::bigint,'evidence manifest preserves the exact candidate');
select is((select count(*) from public.products),0::bigint,'v3 routing does not create public products');
select is((select count(*) from public.rulesets where is_published),0::bigint,'v3 routing does not publish rules');
select * from finish();
rollback;
