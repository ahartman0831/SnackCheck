begin;
select plan(8);

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

insert into public.submissions (
  id, status, anonymous_key_hash, token_expires_at
) values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'NEEDS_CONFIRMATION',
  repeat('d', 64),
  now() + interval '1 hour'
);

select is(
  public.finalize_submission_evaluation(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Sugar, salt',
    repeat('f', 64),
    '{"ingredientStatus":"VERIFY","qualityFlags":["UNCONFIRMED_EVIDENCE"]}'::jsonb
  ),
  true,
  'confirmation and evaluation persist atomically'
);
select is(
  (select status::text from public.submissions where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'EVALUATED',
  'confirmed submission reaches evaluated only after persistence'
);

select * from finish();
rollback;
