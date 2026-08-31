begin;
select plan(21);

select has_table('public', 'catalog_import_batches', 'private import audit table exists');
select has_table('public', 'catalog_source_records', 'private source record table exists');
select has_function('public', 'create_catalog_import_batch', array['jsonb'], 'batch creation function exists');
select has_function('public', 'import_catalog_source_record', array['jsonb'], 'record import function exists');
select has_function('public', 'complete_catalog_import_batch', array['uuid','jsonb'], 'batch completion function exists');
select function_privs_are('public', 'import_catalog_source_record', array['jsonb'], 'anon', array[]::text[], 'anonymous users cannot import candidates');
select function_privs_are('public', 'import_catalog_source_record', array['jsonb'], 'authenticated', array[]::text[], 'signed-in users cannot import candidates');
select table_privs_are('public', 'catalog_source_records', 'anon', array[]::text[], 'anonymous users cannot read candidates');
select table_privs_are('public', 'catalog_source_records', 'authenticated', array[]::text[], 'signed-in users cannot read candidates');

set local role service_role;
create temporary table candidate_test_values (batch_id uuid, first_id uuid, second_id uuid);
insert into candidate_test_values (batch_id)
select public.create_catalog_import_batch(jsonb_build_object(
  'provider', 'USDA_FDC', 'datasetRelease', 'synthetic-2026-08',
  'sourceUrl', 'https://fdc.nal.usda.gov/download-datasets/', 'licenseIdentifier', 'CC0-1.0',
  'fileSha256', repeat('a', 64), 'fileByteSize', 512, 'mode', 'APPLY',
  'parserVersion', 'usda-branded-csv-v1', 'normalizerVersion', 'gtin-v1',
  'engineVersion', 'test-engine', 'rulesetHash', repeat('b', 64)
));
select is((select count(*) from candidate_test_values), 1::bigint, 'service role can create an import batch');

with imported as (
  select public.import_catalog_source_record(jsonb_build_object(
    'importBatchId', (select batch_id from candidate_test_values), 'provider', 'USDA_FDC',
    'externalRecordId', '1001', 'sourceVersion', '2026-08-01',
    'sourceRecordSha256', repeat('c', 64), 'sourceGtin', '012345678905',
    'normalizedGtin14', '00012345678905', 'brand', 'Fixture Foods', 'productName', 'Oat Bites',
    'variant', '', 'size', '6 oz', 'category', 'Snacks',
    'rawIngredientText', 'Oats, salt', 'normalizedIngredientText', 'oats, salt',
    'ingredientTextSha256', repeat('d', 64), 'marketCountry', 'United States',
    'sourceModifiedAt', '2026-08-01T00:00:00Z', 'sourcePublishedAt', '2026-08-02T00:00:00Z',
    'discontinued', false, 'sourceUrl', 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/1001',
    'sourceReference', 'FDC 1001', 'licenseIdentifier', 'CC0-1.0', 'attribution', 'USDA FoodData Central',
    'screenStatus', 'PASS', 'qualityFlags', '[]'::jsonb, 'matchedRuleIds', '[]'::jsonb,
    'engineVersion', 'test-engine', 'rulesetHash', repeat('b', 64)
  )) result
)
update candidate_test_values set first_id = (select (result ->> 'recordId')::uuid from imported);
select is((select candidate_state from public.catalog_source_records where id = (select first_id from candidate_test_values)), 'SCREENED_PASS', 'a passing import remains a private screened candidate');
select is((select verification_status::text from public.formulations where id = (select first_id from candidate_test_values)), null, 'candidate import creates no canonical formulation');

select is(
  (select public.import_catalog_source_record(jsonb_build_object(
    'importBatchId', (select batch_id from candidate_test_values), 'provider', 'USDA_FDC',
    'externalRecordId', '1001', 'sourceVersion', '2026-08-01', 'sourceRecordSha256', repeat('c', 64)
  )) ->> 'action'),
  'unchanged', 'an identical source version is idempotent'
);
select is((select count(*) from public.catalog_source_records), 1::bigint, 'idempotent replay adds no row');

with imported as (
  select public.import_catalog_source_record(jsonb_build_object(
    'importBatchId', (select batch_id from candidate_test_values), 'provider', 'USDA_FDC',
    'externalRecordId', '1001', 'sourceVersion', '2026-08-15',
    'sourceRecordSha256', repeat('e', 64), 'sourceGtin', '012345678905',
    'normalizedGtin14', '00012345678905', 'brand', 'Fixture Foods', 'productName', 'Oat Bites',
    'size', '6 oz', 'category', 'Snacks', 'rawIngredientText', 'Oats, salt, colors',
    'normalizedIngredientText', 'oats, salt, colors', 'ingredientTextSha256', repeat('f', 64),
    'marketCountry', 'United States', 'sourceModifiedAt', '2026-08-15T00:00:00Z',
    'sourcePublishedAt', '2026-08-16T00:00:00Z', 'discontinued', false,
    'sourceUrl', 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/1001',
    'sourceReference', 'FDC 1001', 'licenseIdentifier', 'CC0-1.0', 'attribution', 'USDA FoodData Central',
    'screenStatus', 'FAIL', 'qualityFlags', '[]'::jsonb,
    'matchedRuleIds', '["fixture-rule"]'::jsonb, 'engineVersion', 'test-engine',
    'rulesetHash', repeat('b', 64)
  )) result
)
update candidate_test_values set second_id = (select (result ->> 'recordId')::uuid from imported);
select is((select candidate_state from public.catalog_source_records where id = (select first_id from candidate_test_values)), 'SUPERSEDED', 'a changed version supersedes the older candidate');
select is((select superseded_by_id from public.catalog_source_records where id = (select first_id from candidate_test_values)), (select second_id from candidate_test_values), 'the old record points to its successor');
select is((select candidate_state from public.catalog_source_records where id = (select second_id from candidate_test_values)), 'SCREENED_FAIL', 'the new version keeps its deterministic screen result');
select is((select count(*) from public.products), 0::bigint, 'candidate imports create no public products');
select is((select count(*) from public.list_approved_public_products(null, null, 24, 0)), 0::bigint, 'candidates cannot enter the approved projection');

select lives_ok(
  $$select public.complete_catalog_import_batch(
    (select batch_id from candidate_test_values),
    '{"status":"COMPLETED","rowsRead":3,"rowsAccepted":2,"rowsRejected":0,"rowsUnchanged":1,"rowsSuperseded":1,"errorCounts":{}}'
  )$$,
  'service role can complete the audit batch'
);
select is((select status from public.catalog_import_batches where id = (select batch_id from candidate_test_values)), 'COMPLETED', 'completed audit is recorded');

reset role;
select * from finish();
rollback;
