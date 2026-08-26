begin;
select plan(6);

select is(
  (select count(*)::int from public.prohibited_substances where ruleset_id = '33333333-3333-3333-3333-333333333333'),
  11,
  'eleven statutory substances are seeded'
);

select ok(
  (select bool_and(regulatory_source_id is not null) from public.prohibited_substances),
  'every substance points at a source'
);

select is(
  (select count(*)::int from public.rule_aliases where enabled and review_status = 'PENDING_REVIEW'),
  0,
  'pending aliases are not enabled'
);

select throws_ok(
  $$insert into public.rule_aliases (
      prohibited_substance_id, alias, normalized_alias, match_mode, review_status, enabled
    ) values (
      '44444444-4444-4444-4444-444444444411',
      'invented',
      'invented alias',
      'TOKEN_SEQUENCE',
      'PENDING_REVIEW',
      true
    )$$,
  'enabled aliases must have an approved review status'
);

select lives_ok(
  $$update public.rulesets set notes = 'deactivation note', effective_until = '2027-06-30' where id = '33333333-3333-3333-3333-333333333333'$$,
  'published ruleset may update deactivation metadata'
);

select throws_ok(
  $$update public.rulesets set title = 'changed' where id = '33333333-3333-3333-3333-333333333333'$$,
  'published rulesets are immutable except deactivation metadata'
);

select * from finish();
rollback;
