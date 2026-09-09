begin;
select plan(14);

select has_table('public','catalog_evidence_dossiers','evidence dossiers exist');
select has_table('public','catalog_evidence_dossier_items','dossier items exist');
select has_column('public','catalog_evidence_ai_run_candidates','dossier_id','AI manifests retain the dossier');
select has_column('public','catalog_evidence_ai_attempts','dossier_id','AI attempts retain the dossier');
select col_is_fk('public','catalog_evidence_dossiers','candidate_id','dossiers reference candidates');
select col_is_fk('public','catalog_evidence_dossier_items','dossier_id','items reference dossiers');
select col_is_fk('public','catalog_evidence_dossier_items','evidence_attempt_id','items reference immutable evidence');
select function_privs_are('public','create_catalog_evidence_dossier',array['jsonb','uuid[]','text[]','text'],'service_role',array['EXECUTE']::text[],'service role can assemble dossiers');
select function_privs_are('public','create_catalog_evidence_dossier',array['jsonb','uuid[]','text[]','text'],'authenticated',array[]::text[],'authenticated users cannot assemble dossiers');
select function_privs_are('public','begin_catalog_evidence_ai_dossier_run',array['jsonb','uuid[]','uuid[]','text'],'service_role',array['EXECUTE']::text[],'service role can begin dossier AI runs');
select function_privs_are('public','begin_catalog_evidence_ai_dossier_run',array['jsonb','uuid[]','uuid[]','text'],'authenticated',array[]::text[],'authenticated users cannot begin dossier AI runs');
select throws_ok(
  $$select public.create_catalog_evidence_dossier('{}'::jsonb,array[]::uuid[],array[]::text[],'wrong')$$,
  '22023','exact staging evidence dossier confirmation is required','dossier creation needs exact confirmation'
);
select throws_ok(
  $$select public.begin_catalog_evidence_ai_dossier_run('{}'::jsonb,array[]::uuid[],array[]::uuid[],'wrong')$$,
  '22023','exact staging AI comparison confirmation is required','dossier comparison needs exact confirmation'
);
select is((select count(*)::integer from public.catalog_evidence_dossiers),0,'migration creates no dossiers');

select * from finish();
rollback;
