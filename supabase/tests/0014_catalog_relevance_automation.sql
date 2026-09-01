begin;
select plan(14);

select has_column('public', 'catalog_source_records', 'classroom_relevance_score', 'candidate relevance score exists');
select has_column('public', 'catalog_source_records', 'classroom_relevance_tier', 'candidate relevance tier exists');
select has_column('public', 'catalog_source_records', 'catalog_automation_route', 'candidate automation route exists');
select has_column('public', 'catalog_source_records', 'classroom_relevance_reasons', 'candidate relevance reasons exist');
select has_column('public', 'catalog_source_records', 'classroom_relevance_assessed_at', 'candidate relevance timestamp exists');
select has_function('public', 'apply_catalog_relevance_assessments', array['jsonb','jsonb','text'], 'bounded relevance assessment function exists');
select function_privs_are('public', 'apply_catalog_relevance_assessments', array['jsonb','jsonb','text'], 'anon', array[]::text[], 'anonymous users cannot assess candidates');
select function_privs_are('public', 'apply_catalog_relevance_assessments', array['jsonb','jsonb','text'], 'authenticated', array[]::text[], 'ordinary authenticated users cannot assess candidates');

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
  ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','USDA_FDC','two','test',repeat('e',64),'012345678912','00012345678912','Fixture Foods','Pure honey','Honey','Honey','honey',repeat('f',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/two','FDC two','CC0-1.0','PASS','[]','test',repeat('d',64),'SCREENED_PASS',false),
  ('92000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000001','USDA_FDC','three','test',repeat('1',64),'012345678929','00012345678929','Fixture Foods','Chocolate snack bar','Snack, Energy & Granola Bars','Unknown flavor','unknown flavor',repeat('2',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/three','FDC three','CC0-1.0','VERIFY','[]','test',repeat('d',64),'SCREENED_VERIFY',false);

set local role service_role;
select throws_ok(
  $$select public.apply_catalog_relevance_assessments('[]'::jsonb,jsonb_build_object('algorithmVersion','classroom-use-v2','assessedCount',0,'selectionHash',repeat('a',64)),'WRONG')$$,
  '22023', 'exact staging relevance confirmation is required', 'exact relevance confirmation is required'
);
select lives_ok(
  $$select public.apply_catalog_relevance_assessments(
    '[{"id":"92000000-0000-4000-8000-000000000001","version":"classroom-use-v2","group":"SNACKS","score":80,"tier":"HIGH","route":"AUTO_EVIDENCE","reasons":["CLASSROOM_CATEGORY_SNACKS"]},{"id":"92000000-0000-4000-8000-000000000002","version":"classroom-use-v2","group":null,"score":0,"tier":"EXCLUDED","route":"DEPRIORITIZED","reasons":["CATEGORY_NOT_CLASSROOM_FOCUSED"]},{"id":"92000000-0000-4000-8000-000000000003","version":"classroom-use-v2","group":"SNACKS","score":80,"tier":"HIGH","route":"HUMAN_EXCEPTION","reasons":["CLASSROOM_CATEGORY_SNACKS"]}]'::jsonb,
    jsonb_build_object('algorithmVersion','classroom-use-v2','assessedCount',3,'selectionHash',repeat('b',64)),
    'APPLY_CLASSROOM_RELEVANCE_TO_STAGING'
  )$$,
  'service role can save bounded relevance assessments'
);
select throws_ok(
  $$select public.apply_catalog_relevance_assessments(
    '[{"id":"92000000-0000-4000-8000-000000000003","version":"classroom-use-v2","group":"SNACKS","score":80,"tier":"HIGH","route":"AUTO_EVIDENCE","reasons":["CLASSROOM_CATEGORY_SNACKS"]}]'::jsonb,
    jsonb_build_object('algorithmVersion','classroom-use-v2','assessedCount',1,'selectionHash',repeat('c',64)),
    'APPLY_CLASSROOM_RELEVANCE_TO_STAGING'
  )$$,
  '40001', 'only clean passing candidates can use automated evidence routing', 'uncertain ingredients cannot enter automatic evidence routing'
);

reset role;
select results_eq(
  $$select catalog_automation_route from public.catalog_source_records where id between '92000000-0000-4000-8000-000000000001' and '92000000-0000-4000-8000-000000000003' order by id$$,
  $$values ('AUTO_EVIDENCE'::text), ('DEPRIORITIZED'::text), ('HUMAN_EXCEPTION'::text)$$,
  'assessments persist the expected routes'
);
select is((select count(*) from public.admin_audit_log where action='CATALOG_RELEVANCE_ASSESSED'),3::bigint,'every assessment is audited');
select is((select count(*) from public.products),0::bigint,'relevance assessment cannot create public products');

select * from finish();
rollback;
