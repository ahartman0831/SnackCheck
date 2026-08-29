create table public.ai_extraction_daily_counters (
  occurred_on date primary key default (timezone('utc', now()))::date,
  accepted_count integer not null default 0 check (accepted_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_extraction_daily_counters enable row level security;
revoke all on public.ai_extraction_daily_counters from public, anon, authenticated;

create table public.extraction_attempts (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  sanitized_sha256 text not null check (sanitized_sha256 ~ '^[0-9a-f]{64}$'),
  attempt_ordinal smallint not null check (attempt_ordinal between 1 and 3),
  provider text not null,
  model text not null,
  prompt_version text not null,
  outcome text not null check (outcome in ('ACCEPTED', 'LOW_CONFIDENCE', 'INVALID', 'ERROR', 'TIMEOUT')),
  failure_code text null,
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer null check (input_tokens is null or input_tokens >= 0),
  output_tokens integer null check (output_tokens is null or output_tokens >= 0),
  estimated_cost_usd numeric(12, 6) null check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  extraction_json jsonb null,
  created_at timestamptz not null default now(),
  unique (submission_id, attempt_ordinal)
);

alter table public.extraction_attempts enable row level security;
revoke all on public.extraction_attempts from public, anon, authenticated;

insert into public.application_settings (key, value)
values
  ('ai_extraction_kill_switch', 'true'::jsonb),
  ('ai_extraction_daily_limit', '25'::jsonb)
on conflict (key) do nothing;

create or replace function public.claim_ai_extraction_slot(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  disabled boolean;
  new_count integer;
begin
  if p_limit <= 0 then return false; end if;
  select coalesce((value #>> '{}')::boolean, true)
    into disabled
  from public.application_settings
  where key = 'ai_extraction_kill_switch';
  if coalesce(disabled, true) then return false; end if;

  insert into public.ai_extraction_daily_counters (occurred_on, accepted_count)
  values ((timezone('utc', now()))::date, 1)
  on conflict (occurred_on) do update
    set accepted_count = public.ai_extraction_daily_counters.accepted_count + 1,
        updated_at = now()
  where public.ai_extraction_daily_counters.accepted_count < p_limit
  returning accepted_count into new_count;
  return new_count is not null and new_count <= p_limit;
end;
$$;

revoke all on function public.claim_ai_extraction_slot(integer) from public, anon, authenticated;
grant execute on function public.claim_ai_extraction_slot(integer) to service_role;

alter table public.submissions
  add column confirmed_formulation_hash text null,
  add column evaluation_result_json jsonb null,
  add column confirmed_at timestamptz null;

alter table public.submissions
  add constraint submissions_confirmed_hash_shape check (
    confirmed_formulation_hash is null
    or confirmed_formulation_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint submissions_evaluated_fields_complete check (
    status::text <> 'EVALUATED'
    or (
      corrected_text is not null
      and confirmed_formulation_hash is not null
      and evaluation_result_json is not null
      and confirmed_at is not null
    )
  );

create or replace function public.finalize_submission_evaluation(
  p_submission_id uuid,
  p_corrected_text text,
  p_formulation_hash text,
  p_evaluation_result jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(trim(p_corrected_text)) = 0
    or length(p_corrected_text) > 10000
    or p_formulation_hash !~ '^[0-9a-f]{64}$'
    or p_evaluation_result is null then
    return false;
  end if;

  update public.submissions
  set status = 'CONFIRMED',
      corrected_text = p_corrected_text,
      confirmed_formulation_hash = p_formulation_hash,
      confirmed_at = now(),
      anonymous_key_hash = null
  where id = p_submission_id
    and status::text = 'NEEDS_CONFIRMATION';
  if not found then return false; end if;

  update public.submissions
  set status = 'EVALUATED',
      evaluation_result_json = p_evaluation_result
  where id = p_submission_id
    and status::text = 'CONFIRMED';
  return found;
end;
$$;

revoke all on function public.finalize_submission_evaluation(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.finalize_submission_evaluation(uuid, text, text, jsonb)
  to service_role;
