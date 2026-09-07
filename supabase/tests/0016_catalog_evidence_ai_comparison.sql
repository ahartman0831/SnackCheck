begin;
select plan(35);

select has_table('public','catalog_evidence_ai_runs','AI comparison run table exists');
select has_table('public','catalog_evidence_ai_run_candidates','AI comparison manifest exists');
select has_table('public','catalog_evidence_ai_attempts','AI comparison attempt table exists');
select has_table('public','catalog_evidence_ai_daily_counters','AI comparison daily budget exists');
select table_privs_are('public','catalog_evidence_ai_attempts','anon',array[]::text[],'anonymous users cannot read AI comparisons');
select table_privs_are('public','catalog_evidence_ai_runs','authenticated',array[]::text[],'ordinary users cannot read AI runs');
select table_privs_are('public','catalog_evidence_ai_attempts','service_role',array['SELECT']::text[],'service role reads AI attempts but cannot insert directly');
select function_privs_are('public','begin_catalog_evidence_ai_run',array['jsonb','uuid[]','uuid[]','text'],'service_role',array['EXECUTE']::text[],'service role can begin AI runs');
select function_privs_are('public','claim_catalog_evidence_ai_slot',array['uuid','uuid'],'anon',array[]::text[],'anonymous users cannot claim model spend');
select function_privs_are('public','record_catalog_evidence_ai_attempt',array['uuid','jsonb'],'authenticated',array[]::text[],'ordinary users cannot record AI comparisons');

insert into public.catalog_import_batches (
  id,provider,dataset_release,source_url,license_identifier,file_sha256,file_byte_size,
  mode,status,parser_version,normalizer_version,completed_at
) values (
  'b1000000-0000-4000-8000-000000000001','USDA_FDC','test',
  'https://fdc.nal.usda.gov/download-datasets/','CC0-1.0',repeat('a',64),1,
  'APPLY','COMPLETED','test','test',pg_catalog.now()
);
insert into public.catalog_source_records (
  id,import_batch_id,provider,external_record_id,source_version,source_record_sha256,
  source_gtin,normalized_gtin14,brand,product_name,category,raw_ingredient_text,
  normalized_ingredient_text,ingredient_text_sha256,market_country,source_url,
  source_reference,license_identifier,screen_status,quality_flags,engine_version,
  ruleset_hash,candidate_state,discontinued,classroom_relevance_policy_version,
  classroom_relevance_score,classroom_relevance_tier,catalog_automation_route,
  classroom_relevance_reasons
) values
(
  'b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',
  'USDA_FDC','one','test',repeat('b',64),'012345678905','00012345678905',
  'Fixture Foods','Pretzel snack packs','Snacks','Wheat, salt','wheat salt',repeat('c',64),
  'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/one','FDC one','CC0-1.0',
  'PASS','[]','test',repeat('d',64),'REVIEW_QUEUED',false,'classroom-use-v2',80,
  'HIGH','AUTO_EVIDENCE','["CLASSROOM_CATEGORY_SNACKS"]'
),
(
  'b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001',
  'USDA_FDC','two','test',repeat('e',64),'012345678912','00012345678912',
  'Fixture Foods','Cracker packs','Snacks','Wheat, salt','wheat salt',repeat('f',64),
  'US','https://fdc.nal.usda.gov/fdc-app.html#/food-details/two','FDC two','CC0-1.0',
  'PASS','[]','test',repeat('d',64),'REVIEW_QUEUED',false,'classroom-use-v2',80,
  'HIGH','AUTO_EVIDENCE','["CLASSROOM_CATEGORY_SNACKS"]'
);

insert into public.catalog_evidence_runs (
  id,collector_version,source_policy_version,selection_hash,status,planned_candidates,
  attempted_candidates,evidence_found,max_requests_per_candidate,max_requests_per_run,
  max_response_bytes,request_count,retrieved_bytes,completed_at
) values (
  'b3000000-0000-4000-8000-000000000001','catalog-evidence-v1','evidence-source-v1',
  repeat('1',64),'COMPLETED',2,2,2,1,2,500000,2,200,pg_catalog.now()
);
insert into public.catalog_evidence_run_candidates (run_id,candidate_id,ordinal) values
('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001',0),
('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000002',1);
insert into public.catalog_evidence_attempts (
  id,run_id,candidate_id,outcome,reason_code,request_count,source_kind,source_url,
  source_host,evidence_title,retrieved_at,content_sha256,byte_size,media_type,
  attribution,ingredient_text,evidence_text,attempt_sha256
) values
(
  'b4000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000001','EVIDENCE_FOUND','ALLOWED_SOURCE_RETRIEVED',1,
  'MANUFACTURER','https://fixturefoods.example/pretzels','fixturefoods.example','Pretzels',
  pg_catalog.now(),repeat('2',64),100,'text/html','Fixture Foods','Wheat, salt',
  '{"productName":"Pretzels"}',repeat('3',64)
),
(
  'b4000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000002','EVIDENCE_FOUND','ALLOWED_SOURCE_RETRIEVED',1,
  'SECONDARY','https://world.openfoodfacts.org/product/123','world.openfoodfacts.org','Crackers',
  pg_catalog.now(),repeat('4',64),100,'application/json','Open Food Facts contributors',
  'Wheat, salt','{"productName":"Crackers"}',repeat('5',64)
);
insert into public.ai_model_pricing (
  provider,model,effective_from,input_usd_per_million,cached_input_usd_per_million,
  output_usd_per_million,currency,source_url,source_note
) values (
  'openai','fixture-model','2020-01-01T00:00:00Z',1,0.1,2,'USD',
  'https://developers.openai.com/api/docs/models','test rate'
);

set local role service_role;
select throws_ok(
  $$select public.begin_catalog_evidence_ai_run(
    jsonb_build_object('runId','b5000000-0000-4000-8000-000000000001','promptVersion','catalog-evidence-compare-v1','provider','openai','model','fixture-model','selectionHash',repeat('6',64)),
    array['b2000000-0000-4000-8000-000000000001'::uuid],array['b4000000-0000-4000-8000-000000000001'::uuid],'WRONG'
  )$$,
  '22023','exact staging AI comparison confirmation is required','exact AI staging confirmation is required'
);
select throws_ok(
  $$select public.begin_catalog_evidence_ai_run(
    jsonb_build_object('runId','b5000000-0000-4000-8000-000000000002','promptVersion','catalog-evidence-compare-v1','provider','openai','model','fixture-model','selectionHash',repeat('7',64)),
    array['b2000000-0000-4000-8000-000000000002'::uuid],array['b4000000-0000-4000-8000-000000000002'::uuid],'COMPARE_CATALOG_EVIDENCE_WITH_AI_IN_STAGING'
  )$$,
  '40001','AI comparison requires eligible candidates with manufacturer ingredient evidence','secondary evidence cannot unlock AI comparison'
);
select lives_ok(
  $$select public.begin_catalog_evidence_ai_run(
    jsonb_build_object('runId','b5000000-0000-4000-8000-000000000001','promptVersion','catalog-evidence-compare-v1','provider','openai','model','fixture-model','selectionHash',repeat('6',64)),
    array['b2000000-0000-4000-8000-000000000001'::uuid],array['b4000000-0000-4000-8000-000000000001'::uuid],'COMPARE_CATALOG_EVIDENCE_WITH_AI_IN_STAGING'
  )$$,
  'manufacturer-backed AI run can begin'
);
select lives_ok(
  $$select public.begin_catalog_evidence_ai_run(
    jsonb_build_object('runId','b5000000-0000-4000-8000-000000000001','promptVersion','catalog-evidence-compare-v1','provider','openai','model','fixture-model','selectionHash',repeat('6',64)),
    array['b2000000-0000-4000-8000-000000000001'::uuid],array['b4000000-0000-4000-8000-000000000001'::uuid],'COMPARE_CATALOG_EVIDENCE_WITH_AI_IN_STAGING'
  )$$,
  'identical AI run start is idempotent'
);
select is(public.claim_catalog_evidence_ai_slot('b5000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001'),false,'AI kill switch defaults closed');
reset role;
update public.application_settings set value='false'::jsonb where key='catalog_evidence_ai_kill_switch';
set local role service_role;
select is(public.claim_catalog_evidence_ai_slot('b5000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001'),true,'approved candidate can claim one model slot');
select is(public.claim_catalog_evidence_ai_slot('b5000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001'),false,'the same candidate cannot claim twice');
select throws_ok(
  $$select public.record_catalog_evidence_ai_attempt(
    'b5000000-0000-4000-8000-000000000001',
    jsonb_build_object('candidateId','b2000000-0000-4000-8000-000000000001','evidenceAttemptId','b4000000-0000-4000-8000-000000000001','provider','openai','model','fixture-model','promptVersion','catalog-evidence-compare-v1','providerRequestId','response-bad','outcome','ACCEPTED','identity','MATCH','ingredientAgreement','MATERIAL_DIFFERENCE','discrepancyCodes',jsonb_build_array('INGREDIENTS_ADDED'),'confidence',0.99,'advisoryRoute','CONTINUE_DETERMINISTIC','deterministicConflict',false,'latencyMs',100,'inputTokens',100,'outputTokens',20)
  )$$,
  '22023','accepted AI comparison does not satisfy continuation gates','optimistic AI cannot continue through a discrepancy'
);
select lives_ok(
  $$select public.record_catalog_evidence_ai_attempt(
    'b5000000-0000-4000-8000-000000000001',
    jsonb_build_object('candidateId','b2000000-0000-4000-8000-000000000001','evidenceAttemptId','b4000000-0000-4000-8000-000000000001','provider','openai','model','fixture-model','promptVersion','catalog-evidence-compare-v1','providerRequestId','response-1','outcome','ACCEPTED','identity','MATCH','ingredientAgreement','FORMATTING_ONLY','discrepancyCodes','[]'::jsonb,'confidence',0.99,'advisoryRoute','CONTINUE_DETERMINISTIC','deterministicConflict',false,'latencyMs',100,'inputTokens',100,'cachedInputTokens',10,'outputTokens',20,'reasoningTokens',5)
  )$$,
  'valid high-confidence comparison can be recorded'
);
select lives_ok(
  $$select public.record_catalog_evidence_ai_attempt(
    'b5000000-0000-4000-8000-000000000001',
    jsonb_build_object('candidateId','b2000000-0000-4000-8000-000000000001','evidenceAttemptId','b4000000-0000-4000-8000-000000000001','provider','openai','model','fixture-model','promptVersion','catalog-evidence-compare-v1','providerRequestId','response-1','outcome','ACCEPTED','identity','MATCH','ingredientAgreement','FORMATTING_ONLY','discrepancyCodes','[]'::jsonb,'confidence',0.99,'advisoryRoute','CONTINUE_DETERMINISTIC','deterministicConflict',false,'latencyMs',100,'inputTokens',100,'cachedInputTokens',10,'outputTokens',20,'reasoningTokens',5)
  )$$,
  'identical comparison write is idempotent'
);
select throws_ok(
  $$select public.record_catalog_evidence_ai_attempt(
    'b5000000-0000-4000-8000-000000000001',
    jsonb_build_object('candidateId','b2000000-0000-4000-8000-000000000001','evidenceAttemptId','b4000000-0000-4000-8000-000000000001','provider','openai','model','fixture-model','promptVersion','catalog-evidence-compare-v1','providerRequestId','response-2','outcome','ROUTED_TO_HUMAN','identity','MISMATCH','ingredientAgreement','MATERIAL_DIFFERENCE','discrepancyCodes',jsonb_build_array('GTIN_MISMATCH'),'confidence',0.2,'advisoryRoute','HUMAN_EXCEPTION','deterministicConflict',true,'latencyMs',100)
  )$$,
  '40001','candidate already has a different AI comparison','comparison outcome is immutable'
);
select lives_ok($$select public.complete_catalog_evidence_ai_run('b5000000-0000-4000-8000-000000000001','COMPLETED')$$,'fully accounted AI run completes');
select lives_ok($$select public.complete_catalog_evidence_ai_run('b5000000-0000-4000-8000-000000000001','COMPLETED')$$,'AI completion is idempotent');

reset role;
select is((select status from public.catalog_evidence_ai_runs where id='b5000000-0000-4000-8000-000000000001'),'COMPLETED','run is completed');
select is((select claimed_calls from public.catalog_evidence_ai_runs where id='b5000000-0000-4000-8000-000000000001'),1::smallint,'claimed calls are counted');
select is((select continued_candidates from public.catalog_evidence_ai_runs where id='b5000000-0000-4000-8000-000000000001'),1::smallint,'continued candidates are counted once');
select is((select count(*) from public.catalog_evidence_ai_attempts where run_id='b5000000-0000-4000-8000-000000000001'),1::bigint,'one immutable AI attempt exists');
select is((select input_tokens from public.catalog_evidence_ai_attempts where run_id='b5000000-0000-4000-8000-000000000001'),100,'input tokens are preserved');
select is((select cached_input_tokens from public.catalog_evidence_ai_attempts where run_id='b5000000-0000-4000-8000-000000000001'),10,'cached tokens are preserved');
select is((select output_tokens from public.catalog_evidence_ai_attempts where run_id='b5000000-0000-4000-8000-000000000001'),20,'output tokens are preserved');
select is((select reasoning_tokens from public.catalog_evidence_ai_attempts where run_id='b5000000-0000-4000-8000-000000000001'),5,'reasoning tokens are preserved');
select is((select estimated_total_cost_usd from public.catalog_evidence_ai_attempts where run_id='b5000000-0000-4000-8000-000000000001'),0.000131::numeric,'verified rate card calculates exact comparison cost');
select is((select count(*) from public.ai_usage_ledger where catalog_evidence_ai_attempt_id is not null),1::bigint,'central AI spend ledger links the catalog comparison');
select is((select count(*) from public.admin_audit_log where request_id='catalog-evidence-ai-b5000000-0000-4000-8000-000000000001'),3::bigint,'AI run start attempt and close are audited');
select is((select count(*) from public.products),0::bigint,'AI comparison cannot create products');

select * from finish();
rollback;
