begin;
select plan(28);

select has_table('public', 'catalog_evidence_runs', 'private evidence run table exists');
select has_table('public', 'catalog_evidence_run_candidates', 'private evidence manifest exists');
select has_table('public', 'catalog_evidence_attempts', 'private evidence dossier table exists');
select table_privs_are('public', 'catalog_evidence_runs', 'anon', array[]::text[], 'anonymous users cannot read evidence runs');
select table_privs_are('public', 'catalog_evidence_attempts', 'authenticated', array[]::text[], 'ordinary signed-in users cannot read evidence dossiers');
select table_privs_are('public', 'catalog_evidence_runs', 'service_role', array['SELECT']::text[], 'service role can read evidence runs only');
select function_privs_are('public', 'begin_catalog_evidence_run', array['jsonb','uuid[]','text'], 'anon', array[]::text[], 'anonymous users cannot begin evidence runs');
select function_privs_are('public', 'record_catalog_evidence_attempt', array['uuid','jsonb'], 'authenticated', array[]::text[], 'ordinary users cannot record evidence');
select function_privs_are('public', 'complete_catalog_evidence_run', array['uuid','text'], 'service_role', array['EXECUTE']::text[], 'service role can close evidence runs');

insert into public.catalog_import_batches (
  id, provider, dataset_release, source_url, license_identifier, file_sha256,
  file_byte_size, mode, status, parser_version, normalizer_version, completed_at
) values (
  'a1000000-0000-4000-8000-000000000001', 'USDA_FDC', 'test',
  'https://fdc.nal.usda.gov/download-datasets/', 'CC0-1.0', repeat('a', 64),
  1, 'APPLY', 'COMPLETED', 'test', 'test', pg_catalog.now()
);
insert into public.catalog_source_records (
  id, import_batch_id, provider, external_record_id, source_version,
  source_record_sha256, source_gtin, normalized_gtin14, brand, product_name,
  category, raw_ingredient_text, normalized_ingredient_text, ingredient_text_sha256,
  market_country, source_url, source_reference, license_identifier, screen_status,
  quality_flags, engine_version, ruleset_hash, candidate_state, discontinued,
  classroom_relevance_policy_version, classroom_relevance_score,
  classroom_relevance_tier, catalog_automation_route, classroom_relevance_reasons
) values
  (
    'a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',
    'USDA_FDC','one','test',repeat('b',64),'012345678905','00012345678905',
    'Fixture Foods','Pretzel snack packs','Chips, Pretzels & Snacks','Wheat, salt',
    'wheat salt',repeat('c',64),'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/one',
    'FDC one','CC0-1.0','PASS','[]','test',repeat('d',64),'REVIEW_QUEUED',false,
    'classroom-use-v2',80,'HIGH','AUTO_EVIDENCE','["CLASSROOM_CATEGORY_SNACKS"]'
  ),
  (
    'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',
    'USDA_FDC','two','test',repeat('e',64),'012345678912','00012345678912',
    'Fixture Foods','Bulk flour','Flour','Wheat','wheat',repeat('f',64),'US',
    'https://fdc.nal.usda.gov/fdc-app.html#/food-details/two','FDC two','CC0-1.0',
    'PASS','[]','test',repeat('d',64),'SCREENED_PASS',false,
    'classroom-use-v2',0,'EXCLUDED','DEPRIORITIZED','["CATEGORY_NOT_CLASSROOM_FOCUSED"]'
  );

set local role service_role;
select throws_ok(
  $$select public.begin_catalog_evidence_run(
    jsonb_build_object('runId','a3000000-0000-4000-8000-000000000001','collectorVersion','catalog-evidence-v1','sourcePolicyVersion','evidence-source-v1','selectionHash',repeat('1',64),'maxRequestsPerCandidate',3,'maxRequestsPerRun',3,'maxResponseBytes',2000000),
    array['a2000000-0000-4000-8000-000000000001'::uuid], 'WRONG'
  )$$,
  '22023', 'exact staging evidence confirmation is required', 'exact staging confirmation is required'
);
select lives_ok(
  $$select public.begin_catalog_evidence_run(
    jsonb_build_object('runId','a3000000-0000-4000-8000-000000000001','collectorVersion','catalog-evidence-v1','sourcePolicyVersion','evidence-source-v1','selectionHash',repeat('1',64),'maxRequestsPerCandidate',3,'maxRequestsPerRun',3,'maxResponseBytes',2000000),
    array['a2000000-0000-4000-8000-000000000001'::uuid], 'COLLECT_CATALOG_EVIDENCE_TO_STAGING'
  )$$,
  'eligible evidence run can begin'
);
select lives_ok(
  $$select public.begin_catalog_evidence_run(
    jsonb_build_object('runId','a3000000-0000-4000-8000-000000000001','collectorVersion','catalog-evidence-v1','sourcePolicyVersion','evidence-source-v1','selectionHash',repeat('1',64),'maxRequestsPerCandidate',3,'maxRequestsPerRun',3,'maxResponseBytes',2000000),
    array['a2000000-0000-4000-8000-000000000001'::uuid], 'COLLECT_CATALOG_EVIDENCE_TO_STAGING'
  )$$,
  'identical evidence run start is idempotent'
);
select throws_ok(
  $$select public.begin_catalog_evidence_run(
    jsonb_build_object('runId','a3000000-0000-4000-8000-000000000002','collectorVersion','catalog-evidence-v1','sourcePolicyVersion','evidence-source-v1','selectionHash',repeat('2',64),'maxRequestsPerCandidate',3,'maxRequestsPerRun',3,'maxResponseBytes',2000000),
    array['a2000000-0000-4000-8000-000000000002'::uuid], 'COLLECT_CATALOG_EVIDENCE_TO_STAGING'
  )$$,
  '40001', 'evidence run contains an ineligible or changed candidate', 'deprioritized candidate cannot enter evidence run'
);
select lives_ok(
  $$select public.record_catalog_evidence_attempt(
    'a3000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'candidateId','a2000000-0000-4000-8000-000000000001','outcome','EVIDENCE_FOUND',
      'reasonCode','ALLOWED_SOURCE_RETRIEVED','requestCount',2,
      'evidence',jsonb_build_object(
        'sourceKind','MANUFACTURER','url','https://fixturefoods.example/pretzels',
        'hostname','fixturefoods.example','title','Fixture Foods Pretzels',
        'retrievedAt','2026-09-06T00:00:00Z','observedAt','2026-09-01T00:00:00Z',
        'contentSha256',repeat('3',64),'byteSize',1200,'mediaType','text/html',
        'licenseIdentifier',null,'attribution','Fixture Foods',
        'ingredientText','Wheat, salt','evidenceText','Ingredients: Wheat, salt'
      )
    )
  )$$,
  'found evidence can be recorded'
);
select lives_ok(
  $$select public.record_catalog_evidence_attempt(
    'a3000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'candidateId','a2000000-0000-4000-8000-000000000001','outcome','EVIDENCE_FOUND',
      'reasonCode','ALLOWED_SOURCE_RETRIEVED','requestCount',2,
      'evidence',jsonb_build_object(
        'sourceKind','MANUFACTURER','url','https://fixturefoods.example/pretzels',
        'hostname','fixturefoods.example','title','Fixture Foods Pretzels',
        'retrievedAt','2026-09-06T00:00:00Z','observedAt','2026-09-01T00:00:00Z',
        'contentSha256',repeat('3',64),'byteSize',1200,'mediaType','text/html',
        'licenseIdentifier',null,'attribution','Fixture Foods',
        'ingredientText','Wheat, salt','evidenceText','Ingredients: Wheat, salt'
      )
    )
  )$$,
  'identical attempt is idempotent'
);
select throws_ok(
  $$select public.record_catalog_evidence_attempt(
    'a3000000-0000-4000-8000-000000000001',
    jsonb_build_object('candidateId','a2000000-0000-4000-8000-000000000001','outcome','NOT_FOUND','reasonCode','NO_DISCOVERY_RESULT','requestCount',1)
  )$$,
  '40001', 'candidate already has a different evidence outcome for this run', 'candidate outcome is immutable within a run'
);
select lives_ok(
  $$select public.complete_catalog_evidence_run('a3000000-0000-4000-8000-000000000001','COMPLETED')$$,
  'fully accounted evidence run can complete'
);
select lives_ok(
  $$select public.complete_catalog_evidence_run('a3000000-0000-4000-8000-000000000001','COMPLETED')$$,
  'identical completion is idempotent'
);

reset role;
select is((select planned_candidates from public.catalog_evidence_runs where id='a3000000-0000-4000-8000-000000000001'),1::smallint,'run stores exact planned count');
select is((select attempted_candidates from public.catalog_evidence_runs where id='a3000000-0000-4000-8000-000000000001'),1::smallint,'idempotent retry does not double count');
select is((select evidence_found from public.catalog_evidence_runs where id='a3000000-0000-4000-8000-000000000001'),1::smallint,'found evidence count is tracked');
select is((select request_count from public.catalog_evidence_runs where id='a3000000-0000-4000-8000-000000000001'),2,'request spend is tracked');
select is((select retrieved_bytes from public.catalog_evidence_runs where id='a3000000-0000-4000-8000-000000000001'),1200::bigint,'retrieved bytes are tracked');
select is((select status from public.catalog_evidence_runs where id='a3000000-0000-4000-8000-000000000001'),'COMPLETED','run closes only after complete accounting');
select is((select count(*) from public.catalog_evidence_attempts where run_id='a3000000-0000-4000-8000-000000000001'),1::bigint,'one immutable dossier exists per candidate and run');
select is((select source_kind from public.catalog_evidence_attempts where run_id='a3000000-0000-4000-8000-000000000001'),'MANUFACTURER','manufacturer source classification is preserved');
select is((select count(*) from public.admin_audit_log where request_id='catalog-evidence-a3000000-0000-4000-8000-000000000001'),3::bigint,'run start, attempt, and close are audited');
select is((select count(*) from public.products),0::bigint,'evidence collection cannot create products');

select * from finish();
rollback;
