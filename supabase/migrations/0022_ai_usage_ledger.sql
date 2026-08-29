create table public.ai_model_pricing (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider ~ '^[a-z0-9_-]{1,40}$'),
  model text not null check (length(model) between 1 and 120),
  effective_from timestamptz not null,
  effective_until timestamptz null,
  input_usd_per_million numeric(18, 9) not null check (input_usd_per_million >= 0),
  cached_input_usd_per_million numeric(18, 9) null check (
    cached_input_usd_per_million is null or cached_input_usd_per_million >= 0
  ),
  output_usd_per_million numeric(18, 9) not null check (output_usd_per_million >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  source_url text null check (source_url is null or source_url ~ '^https://'),
  source_note text null check (source_note is null or length(source_note) <= 500),
  created_at timestamptz not null default now(),
  check (effective_until is null or effective_until > effective_from),
  unique (provider, model, effective_from)
);

alter table public.ai_model_pricing enable row level security;
revoke all on public.ai_model_pricing from public, anon, authenticated;
grant select, insert, update, delete on public.ai_model_pricing to service_role;

alter table public.extraction_attempts
  add column provider_request_id text null check (
    provider_request_id is null or length(provider_request_id) <= 255
  ),
  add column cached_input_tokens integer null check (
    cached_input_tokens is null or cached_input_tokens >= 0
  ),
  add column reasoning_tokens integer null check (
    reasoning_tokens is null or reasoning_tokens >= 0
  ),
  add column is_retry boolean not null default false,
  add column is_escalation boolean not null default false;

alter table public.extraction_attempts
  add constraint extraction_attempts_cached_token_bounds check (
    cached_input_tokens is null
    or input_tokens is null
    or cached_input_tokens <= input_tokens
  ),
  add constraint extraction_attempts_reasoning_token_bounds check (
    reasoning_tokens is null
    or output_tokens is null
    or reasoning_tokens <= output_tokens
  );

create table public.ai_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  extraction_attempt_id uuid null unique references public.extraction_attempts(id) on delete set null,
  submission_id uuid null references public.submissions(id) on delete set null,
  attempt_ordinal smallint not null check (attempt_ordinal between 1 and 3),
  occurred_at timestamptz not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  provider_request_id text null,
  outcome text not null check (outcome in ('ACCEPTED', 'LOW_CONFIDENCE', 'INVALID', 'ERROR', 'TIMEOUT')),
  failure_code text null,
  latency_ms integer not null check (latency_ms >= 0),
  is_retry boolean not null,
  is_escalation boolean not null,
  input_tokens integer null check (input_tokens is null or input_tokens >= 0),
  cached_input_tokens integer null check (
    cached_input_tokens is null or cached_input_tokens >= 0
  ),
  output_tokens integer null check (output_tokens is null or output_tokens >= 0),
  reasoning_tokens integer null check (
    reasoning_tokens is null or reasoning_tokens >= 0
  ),
  total_tokens integer generated always as (
    case
      when input_tokens is null and output_tokens is null then null
      else coalesce(input_tokens, 0) + coalesce(output_tokens, 0)
    end
  ) stored,
  token_source text not null check (token_source in ('PROVIDER_REPORTED', 'UNAVAILABLE')),
  pricing_id uuid null references public.ai_model_pricing(id) on delete set null,
  input_usd_per_million numeric(18, 9) null,
  cached_input_usd_per_million numeric(18, 9) null,
  output_usd_per_million numeric(18, 9) null,
  estimated_input_cost_usd numeric(18, 9) null check (
    estimated_input_cost_usd is null or estimated_input_cost_usd >= 0
  ),
  estimated_output_cost_usd numeric(18, 9) null check (
    estimated_output_cost_usd is null or estimated_output_cost_usd >= 0
  ),
  estimated_total_cost_usd numeric(18, 9) null check (
    estimated_total_cost_usd is null or estimated_total_cost_usd >= 0
  ),
  billed_cost_usd numeric(18, 9) null check (billed_cost_usd is null or billed_cost_usd >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  cost_source text not null check (
    cost_source in ('RATE_CARD', 'PROVIDER_ESTIMATE', 'UNPRICED')
  ),
  created_at timestamptz not null default now(),
  check (
    cached_input_tokens is null
    or input_tokens is null
    or cached_input_tokens <= input_tokens
  ),
  check (
    reasoning_tokens is null
    or output_tokens is null
    or reasoning_tokens <= output_tokens
  )
);

alter table public.ai_usage_ledger enable row level security;
revoke all on public.ai_usage_ledger from public, anon, authenticated;
grant select, update on public.ai_usage_ledger to service_role;

create index ai_usage_ledger_occurred_at_idx
  on public.ai_usage_ledger (occurred_at desc);
create index ai_usage_ledger_provider_model_idx
  on public.ai_usage_ledger (provider, model, occurred_at desc);
create index ai_usage_ledger_submission_idx
  on public.ai_usage_ledger (submission_id)
  where submission_id is not null;

create or replace function public.sync_ai_usage_ledger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pricing public.ai_model_pricing%rowtype;
  billable_input integer;
  input_cost numeric(18, 9);
  output_cost numeric(18, 9);
  total_cost numeric(18, 9);
  resolved_cost_source text;
begin
  select * into pricing
  from public.ai_model_pricing
  where provider = new.provider
    and model = new.model
    and effective_from <= new.created_at
    and (effective_until is null or effective_until > new.created_at)
  order by effective_from desc
  limit 1;

  if found and (new.input_tokens is not null or new.output_tokens is not null) then
    billable_input := greatest(
      coalesce(new.input_tokens, 0) - coalesce(new.cached_input_tokens, 0),
      0
    );
    input_cost := (
      billable_input * pricing.input_usd_per_million
      + coalesce(new.cached_input_tokens, 0)
        * coalesce(pricing.cached_input_usd_per_million, pricing.input_usd_per_million)
    ) / 1000000;
    output_cost := coalesce(new.output_tokens, 0) * pricing.output_usd_per_million / 1000000;
    total_cost := input_cost + output_cost;
    resolved_cost_source := 'RATE_CARD';
  elsif new.estimated_cost_usd is not null then
    total_cost := new.estimated_cost_usd;
    resolved_cost_source := 'PROVIDER_ESTIMATE';
  else
    resolved_cost_source := 'UNPRICED';
  end if;

  insert into public.ai_usage_ledger (
    extraction_attempt_id,
    submission_id,
    attempt_ordinal,
    occurred_at,
    provider,
    model,
    prompt_version,
    provider_request_id,
    outcome,
    failure_code,
    latency_ms,
    is_retry,
    is_escalation,
    input_tokens,
    cached_input_tokens,
    output_tokens,
    reasoning_tokens,
    token_source,
    pricing_id,
    input_usd_per_million,
    cached_input_usd_per_million,
    output_usd_per_million,
    estimated_input_cost_usd,
    estimated_output_cost_usd,
    estimated_total_cost_usd,
    currency,
    cost_source
  ) values (
    new.id,
    new.submission_id,
    new.attempt_ordinal,
    new.created_at,
    new.provider,
    new.model,
    new.prompt_version,
    new.provider_request_id,
    new.outcome,
    new.failure_code,
    new.latency_ms,
    new.is_retry,
    new.is_escalation,
    new.input_tokens,
    new.cached_input_tokens,
    new.output_tokens,
    new.reasoning_tokens,
    case
      when new.input_tokens is null and new.output_tokens is null then 'UNAVAILABLE'
      else 'PROVIDER_REPORTED'
    end,
    pricing.id,
    pricing.input_usd_per_million,
    pricing.cached_input_usd_per_million,
    pricing.output_usd_per_million,
    input_cost,
    output_cost,
    total_cost,
    coalesce(pricing.currency, 'USD'),
    resolved_cost_source
  )
  on conflict (extraction_attempt_id) do update set
    submission_id = excluded.submission_id,
    attempt_ordinal = excluded.attempt_ordinal,
    occurred_at = excluded.occurred_at,
    provider = excluded.provider,
    model = excluded.model,
    prompt_version = excluded.prompt_version,
    provider_request_id = excluded.provider_request_id,
    outcome = excluded.outcome,
    failure_code = excluded.failure_code,
    latency_ms = excluded.latency_ms,
    is_retry = excluded.is_retry,
    is_escalation = excluded.is_escalation,
    input_tokens = excluded.input_tokens,
    cached_input_tokens = excluded.cached_input_tokens,
    output_tokens = excluded.output_tokens,
    reasoning_tokens = excluded.reasoning_tokens,
    token_source = excluded.token_source,
    pricing_id = excluded.pricing_id,
    input_usd_per_million = excluded.input_usd_per_million,
    cached_input_usd_per_million = excluded.cached_input_usd_per_million,
    output_usd_per_million = excluded.output_usd_per_million,
    estimated_input_cost_usd = excluded.estimated_input_cost_usd,
    estimated_output_cost_usd = excluded.estimated_output_cost_usd,
    estimated_total_cost_usd = excluded.estimated_total_cost_usd,
    currency = excluded.currency,
    cost_source = excluded.cost_source;

  return new;
end;
$$;

revoke all on function public.sync_ai_usage_ledger() from public, anon, authenticated;

create trigger extraction_attempts_sync_ai_usage_ledger
after insert or update of
  provider,
  model,
  prompt_version,
  provider_request_id,
  outcome,
  failure_code,
  latency_ms,
  is_retry,
  is_escalation,
  input_tokens,
  cached_input_tokens,
  output_tokens,
  reasoning_tokens,
  estimated_cost_usd
on public.extraction_attempts
for each row execute function public.sync_ai_usage_ledger();

create view public.ai_usage_daily_summary
with (security_invoker = true)
as
select
  (timezone('utc', occurred_at))::date as occurred_on,
  provider,
  model,
  currency,
  count(*)::bigint as provider_calls,
  count(*) filter (where outcome = 'ACCEPTED')::bigint as accepted_calls,
  count(*) filter (where is_retry)::bigint as retry_calls,
  count(*) filter (where is_escalation)::bigint as escalation_calls,
  count(*) filter (where cost_source = 'UNPRICED')::bigint as unpriced_calls,
  coalesce(sum(input_tokens), 0)::bigint as input_tokens,
  coalesce(sum(cached_input_tokens), 0)::bigint as cached_input_tokens,
  coalesce(sum(output_tokens), 0)::bigint as output_tokens,
  coalesce(sum(reasoning_tokens), 0)::bigint as reasoning_tokens,
  coalesce(sum(total_tokens), 0)::bigint as total_tokens,
  sum(estimated_total_cost_usd) as estimated_total_cost_usd,
  sum(billed_cost_usd) as billed_total_cost_usd
from public.ai_usage_ledger
group by (timezone('utc', occurred_at))::date, provider, model, currency;

revoke all on public.ai_usage_daily_summary from public, anon, authenticated;
grant select on public.ai_usage_daily_summary to service_role;
