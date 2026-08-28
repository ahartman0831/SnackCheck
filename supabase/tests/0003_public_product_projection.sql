begin;
select plan(7);

select is(
  public.escape_like_pattern('100%_off'),
  '100\%\_off',
  'LIKE wildcards are escaped'
);

select is(
  (select count(*)::int from public.current_published_arizona_ruleset()),
  0,
  'no published Arizona ruleset exists until signed review'
);

select is(
  (select count(*)::int from public.list_approved_public_products(null, null, 48, 0)),
  0,
  'approved query is empty when no published ruleset exists'
);

select ok(
  (select count(*) from public.search_public_products('%', 24, 0, null, null, null)) = 0,
  'wildcard-only search does not expand into every product'
);

select ok(
  (select count(*) from public.search_public_products('x', 24, 0, null, null, null)) = 0,
  'queries shorter than two characters return no rows'
);

select ok(
  (select count(*) from public.search_public_products(repeat('ab', 50), 100, 0, null, null, null)) = 0,
  'oversized queries return no rows'
);

select ok(
  exists(select 1 from pg_proc where proname = 'import_catalog_row'),
  'transactional import_catalog_row exists'
);

select * from finish();
rollback;
