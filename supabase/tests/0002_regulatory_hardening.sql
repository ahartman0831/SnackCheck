begin;
select plan(7);

select is(
  (select is_published from public.rulesets where id = '33333333-3333-3333-3333-333333333333'),
  false,
  'AZ-HSA v1 is unpublished until signed review'
);

select ok(
  (select ruleset_hash = public.ruleset_canonical_hash(id) from public.rulesets where id = '33333333-3333-3333-3333-333333333333'),
  'draft seed hash matches the canonical SQL serializer'
);

select lives_ok(
  $$update public.rulesets set title = 'Draft title change' where id = '33333333-3333-3333-3333-333333333333'$$,
  'draft ruleset can change before publication'
);

select lives_ok(
  $$select public.clone_ruleset_to_draft('33333333-3333-3333-3333-333333333333')$$,
  'clone-to-draft succeeds without in-place publish'
);

select is(
  (select count(*)::int from public.rulesets where code = 'AZ-HSA'),
  2,
  'clone creates a new version rather than mutating the source in place'
);

select is(
  (select is_published from public.rulesets where code = 'AZ-HSA' and version = 2),
  false,
  'cloned ruleset is a draft'
);

update public.rulesets
set title = 'Independent draft title'
where code = 'AZ-HSA'
  and version = 2;

select is(
  (select title from public.rulesets where code = 'AZ-HSA' and version = 1),
  'Draft title change',
  'editing a draft clone does not change the prior version'
);

select * from finish();
rollback;
