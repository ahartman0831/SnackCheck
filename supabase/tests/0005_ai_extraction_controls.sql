begin;
select plan(13);

select has_table('public', 'extraction_attempts', 'provider attempts are persisted');
select has_table('public', 'ai_extraction_daily_counters', 'AI daily counters exist');
select has_column('public', 'submissions', 'evaluation_result_json', 'submission result is persisted');

select is(
  (select value from public.application_settings where key = 'ai_extraction_kill_switch'),
  'true'::jsonb,
  'AI extraction starts disabled'
);
select is(public.claim_ai_extraction_slot(1), false, 'kill switch blocks provider spend');

update public.application_settings set value = 'false'::jsonb
where key = 'ai_extraction_kill_switch';
select is(public.claim_ai_extraction_slot(1), true, 'one bounded extraction slot may be claimed');

insert into public.products (id, brand, name, slug)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Test Brand',
  'Phase 7 Test Product',
  'phase-7-test-product'
);

insert into public.submissions (
  id, product_id, status, anonymous_key_hash, token_expires_at
) values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'NEEDS_CONFIRMATION',
  repeat('d', 64),
  now() + interval '1 hour'
);

select is(
  public.persist_confirmed_submission_evaluation(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Sugar, salt',
    'sugar salt',
    repeat('f', 64),
    '[{"ordinal":0,"raw":"Sugar","normalized":"sugar","parentOrdinal":null,"presenceKind":"DECLARED"},{"ordinal":1,"raw":"salt","normalized":"salt","parentOrdinal":null,"presenceKind":"DECLARED"}]'::jsonb,
    '',
    ('{"ingredientStatus":"VERIFY","applicabilityStatus":"UNKNOWN","localPolicyStatus":"NOT_REQUESTED","qualityFlags":["UNCONFIRMED_EVIDENCE"],"rulesetHash":"","formulationHash":"' || repeat('f', 64) || '","engineVersion":"test","evaluatedAt":"2026-08-28T00:00:00.000Z","matchedRules":[],"explanation":{}}')::jsonb
  ),
  true,
  'confirmation and evaluation persist atomically'
);
select is(
  (select status::text from public.submissions where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'EVALUATED',
  'confirmed submission reaches evaluated only after persistence'
);

select is(
  (select count(*)::integer from public.formulations where product_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  1,
  'confirmed known-product text creates one formulation'
);
select is(
  (select active from public.formulations where product_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  false,
  'community formulation is not made public automatically'
);
select is(
  (select count(*)::integer from public.formulation_sources where source_reference = 'submission:dddddddd-dddd-dddd-dddd-dddddddddddd'),
  1,
  'submission provenance is attached to the formulation'
);
select is(
  (select count(*)::integer from public.formulation_ingredients ingredient join public.formulations formulation on formulation.id = ingredient.formulation_id where formulation.product_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  2,
  'deterministically parsed ingredients are persisted'
);
select is(
  (select count(*)::integer from public.compliance_evaluations evaluation join public.formulations formulation on formulation.id = evaluation.formulation_id where formulation.product_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  0,
  'unpublished rulesets never create durable compliance evaluations'
);

select * from finish();
rollback;
