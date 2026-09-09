begin;
select plan(5);
select is(public.formulation_freshness_state(null, 180, 365), 'STALE', 'missing evidence date fails closed');
select is(public.formulation_freshness_state(now() + interval '2 days', 180, 365), 'STALE', 'future evidence fails closed');
select is(public.formulation_freshness_state(now(), 180, 365), 'CURRENT', 'same-day evidence is current');
select is(public.formulation_freshness_state(now() - interval '200 days', 180, 365), 'AGING', 'aging evidence remains aging');
select is((select provolatile::text from pg_proc where oid = 'public.formulation_freshness_state(timestamptz,integer,integer)'::regprocedure), 's', 'date-dependent function is stable');
select * from finish();
rollback;
