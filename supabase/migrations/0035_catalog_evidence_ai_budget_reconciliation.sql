alter table public.catalog_evidence_ai_run_candidates
  add column reservation_released_at timestamptz,
  add column reservation_release_reason text
    check (reservation_release_reason is null or reservation_release_reason in ('PROVIDER_AUTH','PROVIDER_REQUEST_INVALID')),
  add constraint catalog_evidence_ai_reservation_release_complete check (
    (reservation_released_at is null and reservation_release_reason is null)
    or (reservation_released_at is not null and reservation_release_reason is not null)
  );

alter table public.catalog_evidence_ai_daily_counters
  add column released_nonbillable_count integer not null default 0
    check (released_nonbillable_count >= 0 and released_nonbillable_count <= claimed_count);

insert into public.application_settings (key, value)
values
  ('catalog_evidence_ai_daily_limit', '50'::jsonb),
  ('catalog_evidence_ai_hourly_limit', '15'::jsonb)
on conflict (key) do update set value = excluded.value;

create or replace function public.claim_catalog_evidence_ai_slot(
  p_run_id uuid,
  p_candidate_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  disabled boolean;
  daily_limit integer;
  hourly_limit integer;
  hourly_count integer;
  new_count integer;
begin
  select coalesce((value #>> '{}')::boolean,true) into disabled
  from public.application_settings where key = 'catalog_evidence_ai_kill_switch';
  select coalesce((value #>> '{}')::integer,0) into daily_limit
  from public.application_settings where key = 'catalog_evidence_ai_daily_limit';
  select coalesce((value #>> '{}')::integer,0) into hourly_limit
  from public.application_settings where key = 'catalog_evidence_ai_hourly_limit';
  if coalesce(disabled,true)
    or coalesce(daily_limit,0) not between 1 and 100
    or coalesce(hourly_limit,0) not between 1 and least(daily_limit,50) then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('catalog-evidence-ai-budget', 0)
  );
  select pg_catalog.count(*) into hourly_count
  from public.catalog_evidence_ai_run_candidates
  where claimed_at >= pg_catalog.now() - interval '1 hour'
    and reservation_released_at is null;
  if hourly_count >= hourly_limit then return false; end if;

  update public.catalog_evidence_ai_run_candidates planned
  set claimed_at = pg_catalog.now()
  from public.catalog_evidence_ai_runs run
  where planned.run_id = p_run_id and planned.candidate_id = p_candidate_id
    and planned.run_id = run.id and run.status = 'STARTED'
    and planned.claimed_at is null and run.claimed_calls < run.planned_candidates;
  if not found then return false; end if;

  insert into public.catalog_evidence_ai_daily_counters (occurred_on,claimed_count)
  values ((pg_catalog.timezone('utc',pg_catalog.now()))::date,1)
  on conflict (occurred_on) do update
    set claimed_count = public.catalog_evidence_ai_daily_counters.claimed_count + 1,
        updated_at = pg_catalog.now()
  where public.catalog_evidence_ai_daily_counters.claimed_count
      - public.catalog_evidence_ai_daily_counters.released_nonbillable_count < daily_limit
  returning claimed_count into new_count;
  if new_count is null then
    update public.catalog_evidence_ai_run_candidates set claimed_at = null
    where run_id = p_run_id and candidate_id = p_candidate_id;
    return false;
  end if;

  update public.catalog_evidence_ai_runs
  set claimed_calls = claimed_calls + 1
  where id = p_run_id;
  return true;
end;
$$;

create or replace function public.reconcile_catalog_evidence_ai_reservation(
  p_run_id uuid,
  p_candidate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  planned public.catalog_evidence_ai_run_candidates%rowtype;
  attempt public.catalog_evidence_ai_attempts%rowtype;
  released_count integer;
  circuit_opened boolean := false;
begin
  select * into planned
  from public.catalog_evidence_ai_run_candidates
  where run_id = p_run_id and candidate_id = p_candidate_id
  for update;
  if not found or planned.claimed_at is null then
    raise exception using errcode = '40001', message = 'AI comparison reservation does not exist';
  end if;
  if planned.reservation_released_at is not null then
    return pg_catalog.jsonb_build_object(
      'released',true,
      'reason',planned.reservation_release_reason,
      'idempotent',true,
      'circuitOpened',false
    );
  end if;

  select * into attempt
  from public.catalog_evidence_ai_attempts
  where run_id = p_run_id and candidate_id = p_candidate_id;
  if not found then
    raise exception using errcode = '40001', message = 'AI comparison attempt must be recorded before reconciliation';
  end if;

  if attempt.outcome <> 'ERROR'
    or attempt.failure_code not in ('PROVIDER_AUTH','PROVIDER_REQUEST_INVALID')
    or attempt.provider_request_id is not null
    or attempt.input_tokens is not null
    or attempt.cached_input_tokens is not null
    or attempt.output_tokens is not null
    or attempt.reasoning_tokens is not null
    or coalesce(attempt.estimated_total_cost_usd,0) <> 0 then
    return pg_catalog.jsonb_build_object('released',false,'idempotent',false,'circuitOpened',false);
  end if;

  update public.catalog_evidence_ai_run_candidates
  set reservation_released_at = pg_catalog.now(),
      reservation_release_reason = attempt.failure_code
  where run_id = p_run_id and candidate_id = p_candidate_id;

  update public.catalog_evidence_ai_daily_counters
  set released_nonbillable_count = released_nonbillable_count + 1,
      updated_at = pg_catalog.now()
  where occurred_on = (pg_catalog.timezone('utc',planned.claimed_at))::date
    and released_nonbillable_count < claimed_count
  returning released_nonbillable_count into released_count;
  if released_count is null then
    raise exception using errcode = '40001', message = 'AI comparison daily reservation could not be reconciled';
  end if;

  if attempt.failure_code = 'PROVIDER_AUTH' then
    update public.application_settings
    set value = 'true'::jsonb
    where key = 'catalog_evidence_ai_kill_switch'
      and value is distinct from 'true'::jsonb;
    circuit_opened := found;
  end if;

  insert into public.admin_audit_log (
    actor_user_id,action,entity_type,entity_id,after_json,request_id
  ) values (
    null,'CATALOG_EVIDENCE_AI_RESERVATION_RELEASED','catalog_candidate',p_candidate_id,
    pg_catalog.jsonb_build_object(
      'run_id',p_run_id,
      'attempt_id',attempt.id,
      'reason',attempt.failure_code,
      'circuit_opened',circuit_opened
    ),
    'catalog-evidence-ai-' || p_run_id::text
  );
  if circuit_opened then
    insert into public.admin_audit_log (
      actor_user_id,action,entity_type,entity_id,after_json,request_id
    ) values (
      null,'CATALOG_EVIDENCE_AI_CIRCUIT_OPENED','catalog_evidence_ai_run',p_run_id,
      pg_catalog.jsonb_build_object('reason','PROVIDER_AUTH','candidate_id',p_candidate_id),
      'catalog-evidence-ai-' || p_run_id::text
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'released',true,
    'reason',attempt.failure_code,
    'idempotent',false,
    'circuitOpened',circuit_opened
  );
end;
$$;

revoke all on function public.reconcile_catalog_evidence_ai_reservation(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.reconcile_catalog_evidence_ai_reservation(uuid,uuid)
  to service_role;
