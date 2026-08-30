begin;
select plan(10);

select has_function(
  'public', 'resolve_formulation_conflict',
  array['uuid', 'timestamp with time zone', 'timestamp with time zone', 'text', 'text'],
  'transactional conflict resolution function exists'
);

select function_privs_are(
  'public', 'resolve_formulation_conflict',
  array['uuid', 'timestamp with time zone', 'timestamp with time zone', 'text', 'text'],
  'authenticated', array['EXECUTE'],
  'authenticated administrators may invoke conflict resolution'
);

select function_privs_are(
  'public', 'resolve_formulation_conflict',
  array['uuid', 'timestamp with time zone', 'timestamp with time zone', 'text', 'text'],
  'anon', array[]::text[],
  'anonymous users cannot invoke conflict resolution'
);

insert into public.products (id, brand, name, slug, formulation_conflict)
values ('10000000-0000-4000-8000-000000000001', 'Test', 'Conflict', 'test-conflict', true);

insert into public.formulations (
  id, product_id, version, raw_ingredients, normalized_ingredient_text,
  ingredient_text_sha256, verification_status, first_observed_at,
  last_observed_at, last_verified_at, updated_at
) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1,
   'left', 'left', repeat('a', 64), 'PACKAGE_VERIFIED', now(), now(), now(), '2026-08-29T12:00:00Z'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 2,
   'right', 'right', repeat('b', 64), 'CONFLICT', now(), now(), null, '2026-08-29T12:00:00Z');

insert into public.formulation_sources (formulation_id, source_type, source_reference, observed_at)
values ('20000000-0000-4000-8000-000000000001', 'PACKAGE_PHOTO', 'test evidence', now());

insert into public.data_conflicts (
  id, product_id, left_formulation_id, right_formulation_id
) values (
  '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$select public.resolve_formulation_conflict(
    '30000000-0000-4000-8000-000000000001', '2026-08-29T12:00:00Z',
    '2026-08-29T12:00:00Z', 'LEFT', 'request-unauthorized'
  )$$,
  '42501', 'active reviewer access is required',
  'a signed-in non-member is denied'
);

reset role;
insert into auth.users (id, aud, role)
values ('40000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated');
insert into public.admin_members (user_id, role, active)
values ('40000000-0000-4000-8000-000000000001', 'REVIEWER', true);
set local role authenticated;

select throws_ok(
  $$select public.resolve_formulation_conflict(
    '30000000-0000-4000-8000-000000000001', '2026-08-29T12:00:01Z',
    '2026-08-29T12:00:00Z', 'LEFT', 'request-stale-edit'
  )$$,
  '40001', 'formulation changed; refresh before deciding',
  'stale formulation evidence is rejected'
);

select lives_ok(
  $$select public.resolve_formulation_conflict(
    '30000000-0000-4000-8000-000000000001', '2026-08-29T12:00:00Z',
    '2026-08-29T12:00:00Z', 'LEFT', 'request-authorized'
  )$$,
  'an active reviewer can choose verified source-backed evidence'
);

reset role;
select is(
  (select status from public.data_conflicts where id = '30000000-0000-4000-8000-000000000001'),
  'RESOLVED', 'the conflict is resolved'
);
select is(
  (select active from public.formulations where id = '20000000-0000-4000-8000-000000000001'),
  true, 'the selected formulation becomes active'
);
select is(
  (select active from public.formulations where id = '20000000-0000-4000-8000-000000000002'),
  false, 'the unselected formulation remains inactive'
);
select is(
  (select formulation_conflict from public.products where id = '10000000-0000-4000-8000-000000000001'),
  false, 'the product conflict flag clears when no open conflicts remain'
);
select is(
  (select action from public.admin_audit_log where entity_id = '30000000-0000-4000-8000-000000000001'),
  'FORMULATION_CONFLICT_RESOLVED', 'the decision writes an audit record'
);

select * from finish();
rollback;
