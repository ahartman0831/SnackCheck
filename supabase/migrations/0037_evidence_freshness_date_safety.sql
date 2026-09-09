-- Current-date-dependent functions are stable, never immutable. Future evidence
-- cannot satisfy the strict approved projection. No historical data is rewritten.
create or replace function public.formulation_freshness_state(
  last_verified_at timestamptz,
  current_days integer,
  aging_days integer
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when last_verified_at is null then 'STALE'
    when (last_verified_at at time zone 'UTC')::date > (now() at time zone 'UTC')::date then 'STALE'
    when ((now() at time zone 'UTC')::date - (last_verified_at at time zone 'UTC')::date) > aging_days then 'STALE'
    when ((now() at time zone 'UTC')::date - (last_verified_at at time zone 'UTC')::date) > current_days then 'AGING'
    else 'CURRENT'
  end;
$$;
