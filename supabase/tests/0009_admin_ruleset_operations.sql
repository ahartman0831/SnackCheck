begin;
select plan(13);

select has_function('public', 'admin_clone_ruleset_to_draft', array['uuid', 'text', 'text'], 'audited clone function exists');
select has_function('public', 'admin_review_ruleset', array['uuid', 'text', 'text', 'text', 'text'], 'audited review function exists');
select has_function('public', 'admin_publish_ruleset', array['uuid', 'text', 'timestamp with time zone', 'text'], 'audited publish function exists');

select function_privs_are('public', 'clone_ruleset_to_draft', array['uuid'], 'authenticated', array[]::text[], 'legacy clone is not directly callable');
select function_privs_are('public', 'review_ruleset', array['uuid', 'uuid', 'text', 'text'], 'authenticated', array[]::text[], 'legacy review is not directly callable');
select function_privs_are('public', 'publish_ruleset', array['uuid', 'uuid'], 'authenticated', array[]::text[], 'legacy publish is not directly callable');

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.admin_review_ruleset('33333333-3333-3333-3333-333333333333', (select ruleset_hash from public.rulesets where id = '33333333-3333-3333-3333-333333333333'), 'https://example.test/review.pdf', repeat('a', 64), 'request-unauthorized')$$,
  '42501', 'active regulatory administrator access is required', 'non-members cannot review'
);

reset role;
insert into auth.users (id, aud, role) values
  ('50000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated'),
  ('50000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated');
insert into public.admin_members (user_id, role, active) values
  ('50000000-0000-4000-8000-000000000001', 'REGULATORY_ADMIN', true),
  ('50000000-0000-4000-8000-000000000002', 'REGULATORY_ADMIN', true);
set local role authenticated;

select throws_ok(
  $$select public.admin_clone_ruleset_to_draft('33333333-3333-3333-3333-333333333333', 'wrong-hash', 'request-clone-draft')$$,
  '23514', 'only a published ruleset can be cloned', 'an unpublished draft cannot be cloned as a release baseline'
);
select throws_ok(
  $$select public.admin_review_ruleset('33333333-3333-3333-3333-333333333333', 'wrong-hash', 'https://example.test/review.pdf', repeat('a', 64), 'request-stale-review')$$,
  '40001', 'ruleset changed; refresh before reviewing', 'stale review evidence is rejected'
);
select lives_ok(
  $$select public.admin_review_ruleset('33333333-3333-3333-3333-333333333333', (select ruleset_hash from public.rulesets where id = '33333333-3333-3333-3333-333333333333'), 'https://example.test/review.pdf', repeat('a', 64), 'request-valid-review')$$,
  'a regulatory administrator can record signed review evidence'
);

reset role;
select is((select action from public.admin_audit_log where entity_id = '33333333-3333-3333-3333-333333333333'), 'RULESET_REVIEW_RECORDED', 'review is audited');
select is((select review_document_hash from public.rulesets where id = '33333333-3333-3333-3333-333333333333'), repeat('a', 64), 'review hash is recorded');

set local role authenticated;
select throws_ok(
  $$select public.admin_publish_ruleset('33333333-3333-3333-3333-333333333333', (select ruleset_hash from public.rulesets where id = '33333333-3333-3333-3333-333333333333'), (select reviewed_at from public.rulesets where id = '33333333-3333-3333-3333-333333333333'), 'request-same-person')$$,
  '23514', 'publisher must be different from the signed reviewer', 'the reviewer cannot publish their own review'
);

select * from finish();
rollback;
