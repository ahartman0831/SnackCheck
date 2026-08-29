begin;
select plan(6);

select has_function(
  'public',
  'moderate_submission',
  array['uuid', 'timestamp with time zone', 'submission_status', 'text'],
  'transactional submission moderation function exists'
);

select function_privs_are(
  'public',
  'moderate_submission',
  array['uuid', 'timestamp with time zone', 'submission_status', 'text'],
  'authenticated',
  array['EXECUTE'],
  'authenticated administrators may invoke moderation'
);

select function_privs_are(
  'public',
  'moderate_submission',
  array['uuid', 'timestamp with time zone', 'submission_status', 'text'],
  'anon',
  array[]::text[],
  'anonymous users cannot invoke moderation'
);

insert into public.submissions (
  id,
  status,
  corrected_text,
  confirmed_formulation_hash,
  evaluation_result_json,
  confirmed_at,
  updated_at
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'EVALUATED',
  'Test ingredient',
  repeat('a', 64),
  '{}'::jsonb,
  now(),
  '2026-08-29T12:00:00Z'::timestamptz
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff', true);

select throws_ok(
  $$select public.moderate_submission(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '2026-08-29T12:00:00Z'::timestamptz,
    'REVIEW_PENDING',
    'request-unauthorized'
  )$$,
  '42501',
  'active reviewer access is required',
  'a signed-in non-member is denied'
);

reset role;
insert into auth.users (id, aud, role)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'authenticated', 'authenticated');
insert into public.admin_members (user_id, role, active)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'REVIEWER', true);
set local role authenticated;

select lives_ok(
  $$select public.moderate_submission(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '2026-08-29T12:00:00Z'::timestamptz,
    'REVIEW_PENDING',
    'request-authorized'
  )$$,
  'an active reviewer can queue an evaluated submission'
);

reset role;
select is(
  (select action from public.admin_audit_log where entity_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  'SUBMISSION_REVIEW_PENDING',
  'the moderation decision writes an audit record'
);

select * from finish();
rollback;
