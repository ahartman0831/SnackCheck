create table public.catalog_evidence_ai_runs (
  id uuid primary key,
  prompt_version text not null check (prompt_version = 'catalog-evidence-compare-v1'),
  provider text not null check (provider ~ '^[a-z0-9_-]{1,40}$'),
  model text not null check (length(model) between 1 and 120),
  selection_hash text not null check (selection_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'STARTED' check (status in ('STARTED','COMPLETED','FAILED')),
  planned_candidates smallint not null check (planned_candidates between 1 and 5),
  claimed_calls smallint not null default 0 check (claimed_calls between 0 and 5),
  attempted_candidates smallint not null default 0 check (attempted_candidates between 0 and 5),
  continued_candidates smallint not null default 0 check (continued_candidates between 0 and 5),
  human_exception_candidates smallint not null default 0 check (human_exception_candidates between 0 and 5),
  failed_candidates smallint not null default 0 check (failed_candidates between 0 and 5),
  estimated_total_cost_usd numeric(18,9) not null default 0 check (estimated_total_cost_usd >= 0),
  started_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  check (attempted_candidates = continued_candidates + human_exception_candidates + failed_candidates),
  check (attempted_candidates <= claimed_calls and claimed_calls <= planned_candidates),
  check ((status = 'STARTED' and completed_at is null) or (status <> 'STARTED' and completed_at is not null)),
  check (status <> 'COMPLETED' or attempted_candidates = planned_candidates)
);

create table public.catalog_evidence_ai_run_candidates (
  run_id uuid not null references public.catalog_evidence_ai_runs(id) on delete restrict,
  candidate_id uuid not null references public.catalog_source_records(id) on delete restrict,
  evidence_attempt_id uuid not null references public.catalog_evidence_attempts(id) on delete restrict,
  ordinal smallint not null check (ordinal between 0 and 4),
  claimed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (run_id, candidate_id),
  unique (run_id, evidence_attempt_id),
  unique (run_id, ordinal)
);

create table public.catalog_evidence_ai_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.catalog_evidence_ai_runs(id) on delete restrict,
  candidate_id uuid not null references public.catalog_source_records(id) on delete restrict,
  evidence_attempt_id uuid not null references public.catalog_evidence_attempts(id) on delete restrict,
  provider text not null,
  model text not null,
  prompt_version text not null,
  provider_request_id text check (provider_request_id is null or length(provider_request_id) <= 255),
  outcome text not null check (outcome in ('ACCEPTED','ROUTED_TO_HUMAN','INVALID','ERROR','TIMEOUT')),
  failure_code text check (failure_code is null or failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  identity_result text check (identity_result is null or identity_result in ('MATCH','POSSIBLE_MISMATCH','MISMATCH','INSUFFICIENT_EVIDENCE')),
  ingredient_agreement text check (ingredient_agreement is null or ingredient_agreement in ('EXACT','FORMATTING_ONLY','MATERIAL_DIFFERENCE','MISSING_EVIDENCE','UNCERTAIN')),
  discrepancy_codes jsonb not null default '[]'::jsonb check (jsonb_typeof(discrepancy_codes) = 'array' and jsonb_array_length(discrepancy_codes) <= 12),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  advisory_route text not null check (advisory_route in ('CONTINUE_DETERMINISTIC','HUMAN_EXCEPTION')),
  deterministic_conflict boolean not null,
  latency_ms integer not null check (latency_ms >= 0 and latency_ms <= 120000),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  cached_input_tokens integer check (cached_input_tokens is null or cached_input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  reasoning_tokens integer check (reasoning_tokens is null or reasoning_tokens >= 0),
  pricing_id uuid references public.ai_model_pricing(id) on delete set null,
  input_usd_per_million numeric(18,9),
  cached_input_usd_per_million numeric(18,9),
  output_usd_per_million numeric(18,9),
  estimated_input_cost_usd numeric(18,9) check (estimated_input_cost_usd is null or estimated_input_cost_usd >= 0),
  estimated_output_cost_usd numeric(18,9) check (estimated_output_cost_usd is null or estimated_output_cost_usd >= 0),
  estimated_total_cost_usd numeric(18,9) check (estimated_total_cost_usd is null or estimated_total_cost_usd >= 0),
  cost_source text not null check (cost_source in ('RATE_CARD','UNPRICED')),
  attempt_sha256 text not null check (attempt_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default pg_catalog.now(),
  unique (run_id, candidate_id),
  unique (run_id, evidence_attempt_id),
  check (cached_input_tokens is null or input_tokens is null or cached_input_tokens <= input_tokens),
  check (reasoning_tokens is null or output_tokens is null or reasoning_tokens <= output_tokens),
  check (
    (outcome in ('ACCEPTED','ROUTED_TO_HUMAN') and identity_result is not null and ingredient_agreement is not null and confidence is not null)
    or (outcome in ('INVALID','ERROR','TIMEOUT') and identity_result is null and ingredient_agreement is null and confidence is null)
  ),
  check (outcome <> 'ACCEPTED' or (
    advisory_route = 'CONTINUE_DETERMINISTIC'
    and deterministic_conflict = false
    and identity_result = 'MATCH'
    and ingredient_agreement in ('EXACT','FORMATTING_ONLY')
    and discrepancy_codes = '[]'::jsonb
    and confidence >= 0.95
  )),
  check (outcome = 'ACCEPTED' or advisory_route = 'HUMAN_EXCEPTION')
);

alter table public.ai_usage_ledger
  add column catalog_evidence_ai_attempt_id uuid null unique
    references public.catalog_evidence_ai_attempts(id) on delete set null;

create table public.catalog_evidence_ai_daily_counters (
  occurred_on date primary key default (pg_catalog.timezone('utc', pg_catalog.now()))::date,
  claimed_count integer not null default 0 check (claimed_count >= 0),
  updated_at timestamptz not null default pg_catalog.now()
);

insert into public.application_settings (key, value)
values
  ('catalog_evidence_ai_kill_switch', 'true'::jsonb),
  ('catalog_evidence_ai_daily_limit', '5'::jsonb)
on conflict (key) do nothing;

alter table public.catalog_evidence_ai_runs enable row level security;
alter table public.catalog_evidence_ai_run_candidates enable row level security;
alter table public.catalog_evidence_ai_attempts enable row level security;
alter table public.catalog_evidence_ai_daily_counters enable row level security;

revoke all on public.catalog_evidence_ai_runs from public, anon, authenticated, service_role;
revoke all on public.catalog_evidence_ai_run_candidates from public, anon, authenticated, service_role;
revoke all on public.catalog_evidence_ai_attempts from public, anon, authenticated, service_role;
revoke all on public.catalog_evidence_ai_daily_counters from public, anon, authenticated, service_role;
grant select on public.catalog_evidence_ai_runs to service_role;
grant select on public.catalog_evidence_ai_run_candidates to service_role;
grant select on public.catalog_evidence_ai_attempts to service_role;
grant select on public.catalog_evidence_ai_daily_counters to service_role;

create or replace function public.begin_catalog_evidence_ai_run(
  p_run jsonb,
  p_candidate_ids uuid[],
  p_evidence_attempt_ids uuid[],
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id_value uuid;
  candidate_count integer;
  existing_run public.catalog_evidence_ai_runs%rowtype;
begin
  if p_confirmation <> 'COMPARE_CATALOG_EVIDENCE_WITH_AI_IN_STAGING' then
    raise exception using errcode = '22023', message = 'exact staging AI comparison confirmation is required';
  end if;
  candidate_count := coalesce(pg_catalog.cardinality(p_candidate_ids), 0);
  if pg_catalog.jsonb_typeof(p_run) is distinct from 'object'
    or coalesce(p_run ->> 'runId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_run ->> 'promptVersion' <> 'catalog-evidence-compare-v1'
    or coalesce(p_run ->> 'provider','') !~ '^[a-z0-9_-]{1,40}$'
    or length(coalesce(p_run ->> 'model','')) not between 1 and 120
    or coalesce(p_run ->> 'selectionHash','') !~ '^[0-9a-f]{64}$'
    or candidate_count not between 1 and 5
    or candidate_count <> coalesce(pg_catalog.cardinality(p_evidence_attempt_ids), 0)
    or candidate_count <> (select pg_catalog.count(distinct id) from pg_catalog.unnest(p_candidate_ids) id)
    or candidate_count <> (select pg_catalog.count(distinct id) from pg_catalog.unnest(p_evidence_attempt_ids) id) then
    raise exception using errcode = '22023', message = 'valid bounded AI comparison run metadata is required';
  end if;
  run_id_value := (p_run ->> 'runId')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('catalog-evidence-ai-' || run_id_value::text, 0));
  select * into existing_run from public.catalog_evidence_ai_runs where id = run_id_value;
  if found then
    if existing_run.prompt_version <> p_run ->> 'promptVersion'
      or existing_run.provider <> p_run ->> 'provider'
      or existing_run.model <> p_run ->> 'model'
      or existing_run.selection_hash <> p_run ->> 'selectionHash'
      or existing_run.planned_candidates <> candidate_count
      or exists (
        select 1
        from pg_catalog.unnest(p_candidate_ids) with ordinality as requested_candidate(candidate_id, position)
        join pg_catalog.unnest(p_evidence_attempt_ids) with ordinality as requested_evidence(evidence_id, position)
          using (position)
        where not exists (
          select 1 from public.catalog_evidence_ai_run_candidates stored
          where stored.run_id=run_id_value
            and stored.candidate_id=requested_candidate.candidate_id
            and stored.evidence_attempt_id=requested_evidence.evidence_id
        )
      ) then
      raise exception using errcode = '40001', message = 'AI comparison run id was already used differently';
    end if;
    return pg_catalog.jsonb_build_object('runId',run_id_value,'idempotent',true);
  end if;
  if (
    select pg_catalog.count(*)
    from pg_catalog.unnest(p_candidate_ids) with ordinality as planned_candidate(candidate_id, position)
    join pg_catalog.unnest(p_evidence_attempt_ids) with ordinality as planned_evidence(evidence_id, position)
      using (position)
    join public.catalog_source_records candidate on candidate.id = planned_candidate.candidate_id
    join public.catalog_evidence_attempts evidence on evidence.id = planned_evidence.evidence_id and evidence.candidate_id = planned_candidate.candidate_id
    where candidate.candidate_state = 'REVIEW_QUEUED'
      and candidate.screen_status = 'PASS'
      and candidate.catalog_automation_route = 'AUTO_EVIDENCE'
      and candidate.discontinued = false
      and evidence.outcome = 'EVIDENCE_FOUND'
      and evidence.source_kind = 'MANUFACTURER'
      and evidence.ingredient_text is not null
  ) <> candidate_count then
    raise exception using errcode = '40001', message = 'AI comparison requires eligible candidates with manufacturer ingredient evidence';
  end if;
  insert into public.catalog_evidence_ai_runs (
    id,prompt_version,provider,model,selection_hash,planned_candidates
  ) values (
    run_id_value,p_run ->> 'promptVersion',p_run ->> 'provider',p_run ->> 'model',
    p_run ->> 'selectionHash',candidate_count
  );
  insert into public.catalog_evidence_ai_run_candidates (
    run_id,candidate_id,evidence_attempt_id,ordinal
  )
  select run_id_value,planned_candidate.candidate_id,planned_evidence.evidence_id,(planned_candidate.position - 1)::smallint
  from pg_catalog.unnest(p_candidate_ids) with ordinality as planned_candidate(candidate_id, position)
  join pg_catalog.unnest(p_evidence_attempt_ids) with ordinality as planned_evidence(evidence_id, position)
    using (position);
  insert into public.admin_audit_log (
    actor_user_id,action,entity_type,entity_id,after_json,request_id
  ) values (
    null,'CATALOG_EVIDENCE_AI_RUN_STARTED','catalog_evidence_ai_run',run_id_value,
    pg_catalog.jsonb_build_object('planned_candidates',candidate_count,'selection_hash',p_run ->> 'selectionHash','provider',p_run ->> 'provider','model',p_run ->> 'model','prompt_version',p_run ->> 'promptVersion'),
    'catalog-evidence-ai-' || run_id_value::text
  );
  return pg_catalog.jsonb_build_object('runId',run_id_value,'plannedCandidates',candidate_count,'idempotent',false);
end;
$$;

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
  new_count integer;
begin
  select coalesce((value #>> '{}')::boolean,true) into disabled
  from public.application_settings where key = 'catalog_evidence_ai_kill_switch';
  select coalesce((value #>> '{}')::integer,0) into daily_limit
  from public.application_settings where key = 'catalog_evidence_ai_daily_limit';
  if coalesce(disabled,true) or coalesce(daily_limit,0) not between 1 and 25 then return false; end if;
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
  where public.catalog_evidence_ai_daily_counters.claimed_count < daily_limit
  returning claimed_count into new_count;
  if new_count is null then
    update public.catalog_evidence_ai_run_candidates set claimed_at = null
    where run_id = p_run_id and candidate_id = p_candidate_id;
    return false;
  end if;
  update public.catalog_evidence_ai_runs set claimed_calls = claimed_calls + 1 where id = p_run_id;
  return true;
end;
$$;

create or replace function public.record_catalog_evidence_ai_attempt(
  p_run_id uuid,
  p_attempt jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.catalog_evidence_ai_runs%rowtype;
  planned public.catalog_evidence_ai_run_candidates%rowtype;
  existing public.catalog_evidence_ai_attempts%rowtype;
  pricing public.ai_model_pricing%rowtype;
  candidate_id_value uuid;
  outcome_value text;
  route_value text;
  attempt_hash text;
  attempt_id_value uuid;
  input_tokens_value integer;
  cached_tokens_value integer;
  output_tokens_value integer;
  reasoning_tokens_value integer;
  input_cost numeric(18,9);
  output_cost numeric(18,9);
  total_cost numeric(18,9);
  resolved_cost_source text := 'UNPRICED';
begin
  if pg_catalog.jsonb_typeof(p_attempt) is distinct from 'object'
    or coalesce(p_attempt ->> 'candidateId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_attempt ->> 'evidenceAttemptId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_attempt ->> 'outcome' not in ('ACCEPTED','ROUTED_TO_HUMAN','INVALID','ERROR','TIMEOUT')
    or p_attempt ->> 'advisoryRoute' not in ('CONTINUE_DETERMINISTIC','HUMAN_EXCEPTION')
    or p_attempt ->> 'deterministicConflict' not in ('true','false')
    or coalesce(p_attempt ->> 'latencyMs','') !~ '^[0-9]{1,6}$'
    or (p_attempt ->> 'latencyMs')::integer > 120000
    or coalesce(p_attempt ->> 'inputTokens','0') !~ '^[0-9]{1,9}$'
    or coalesce(p_attempt ->> 'cachedInputTokens','0') !~ '^[0-9]{1,9}$'
    or coalesce(p_attempt ->> 'outputTokens','0') !~ '^[0-9]{1,9}$'
    or coalesce(p_attempt ->> 'reasoningTokens','0') !~ '^[0-9]{1,9}$' then
    raise exception using errcode = '22023', message = 'valid AI comparison attempt metadata is required';
  end if;
  candidate_id_value := (p_attempt ->> 'candidateId')::uuid;
  outcome_value := p_attempt ->> 'outcome';
  route_value := p_attempt ->> 'advisoryRoute';
  attempt_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_attempt::text,'utf8'),'sha256'),'hex');
  select * into run_row from public.catalog_evidence_ai_runs where id = p_run_id for update;
  if not found or run_row.status <> 'STARTED' then
    raise exception using errcode = '40001', message = 'AI comparison run is missing or closed';
  end if;
  select * into planned from public.catalog_evidence_ai_run_candidates
  where run_id = p_run_id and candidate_id = candidate_id_value;
  if not found or planned.claimed_at is null then
    raise exception using errcode = '40001', message = 'AI comparison candidate has no claimed slot';
  end if;
  select * into existing from public.catalog_evidence_ai_attempts
  where run_id = p_run_id and candidate_id = candidate_id_value;
  if found then
    if existing.attempt_sha256 <> attempt_hash then
      raise exception using errcode = '40001', message = 'candidate already has a different AI comparison';
    end if;
    return pg_catalog.jsonb_build_object('attemptId',existing.id,'idempotent',true);
  end if;
  if p_attempt ->> 'provider' <> run_row.provider
    or p_attempt ->> 'model' <> run_row.model
    or p_attempt ->> 'promptVersion' <> run_row.prompt_version
    or coalesce(p_attempt ->> 'evidenceAttemptId','')::uuid <> planned.evidence_attempt_id
    or pg_catalog.jsonb_typeof(coalesce(p_attempt -> 'discrepancyCodes','[]'::jsonb)) is distinct from 'array'
    or pg_catalog.jsonb_array_length(coalesce(p_attempt -> 'discrepancyCodes','[]'::jsonb)) > 12
    or exists (
      select 1 from pg_catalog.jsonb_array_elements_text(coalesce(p_attempt -> 'discrepancyCodes','[]'::jsonb)) code
      where code not in ('GTIN_MISMATCH','BRAND_MISMATCH','PRODUCT_NAME_MISMATCH','VARIANT_MISMATCH','PACKAGE_SIZE_MISMATCH','INGREDIENTS_ADDED','INGREDIENTS_REMOVED','INGREDIENTS_REORDERED_OR_REFORMATTED','SOURCE_MISSING_INGREDIENTS','SOURCE_IDENTITY_INCOMPLETE','POSSIBLE_FORMULATION_CHANGE')
    ) then
    raise exception using errcode = '22023', message = 'AI comparison attempt does not match its run manifest';
  end if;
  if outcome_value in ('ACCEPTED','ROUTED_TO_HUMAN') and (
    p_attempt ->> 'identity' not in ('MATCH','POSSIBLE_MISMATCH','MISMATCH','INSUFFICIENT_EVIDENCE')
    or p_attempt ->> 'ingredientAgreement' not in ('EXACT','FORMATTING_ONLY','MATERIAL_DIFFERENCE','MISSING_EVIDENCE','UNCERTAIN')
    or coalesce(p_attempt ->> 'confidence','') !~ '^(0(\.[0-9]+)?|1(\.0+)?)$'
  ) then
    raise exception using errcode = '22023', message = 'successful AI comparison requires structured output';
  end if;
  if outcome_value = 'ACCEPTED' and not (
    route_value = 'CONTINUE_DETERMINISTIC'
    and coalesce((p_attempt ->> 'deterministicConflict')::boolean,true) = false
    and p_attempt ->> 'identity' = 'MATCH'
    and p_attempt ->> 'ingredientAgreement' in ('EXACT','FORMATTING_ONLY')
    and coalesce(p_attempt -> 'discrepancyCodes','[]'::jsonb) = '[]'::jsonb
    and (p_attempt ->> 'confidence')::numeric >= 0.95
  ) then
    raise exception using errcode = '22023', message = 'accepted AI comparison does not satisfy continuation gates';
  end if;
  if outcome_value <> 'ACCEPTED' and route_value <> 'HUMAN_EXCEPTION' then
    raise exception using errcode = '22023', message = 'non-accepted AI comparisons must route to human exception';
  end if;
  input_tokens_value := nullif(p_attempt ->> 'inputTokens','')::integer;
  cached_tokens_value := nullif(p_attempt ->> 'cachedInputTokens','')::integer;
  output_tokens_value := nullif(p_attempt ->> 'outputTokens','')::integer;
  reasoning_tokens_value := nullif(p_attempt ->> 'reasoningTokens','')::integer;
  if coalesce(input_tokens_value,0) < 0 or coalesce(output_tokens_value,0) < 0
    or coalesce(cached_tokens_value,0) < 0 or coalesce(reasoning_tokens_value,0) < 0
    or cached_tokens_value > input_tokens_value or reasoning_tokens_value > output_tokens_value then
    raise exception using errcode = '22023', message = 'AI token usage is invalid';
  end if;
  select * into pricing from public.ai_model_pricing
  where provider = run_row.provider and model = run_row.model
    and effective_from <= pg_catalog.now()
    and (effective_until is null or effective_until > pg_catalog.now())
  order by effective_from desc limit 1;
  if found and (input_tokens_value is not null or output_tokens_value is not null) then
    input_cost := (
      pg_catalog.greatest(coalesce(input_tokens_value,0)-coalesce(cached_tokens_value,0),0) * pricing.input_usd_per_million
      + coalesce(cached_tokens_value,0) * coalesce(pricing.cached_input_usd_per_million,pricing.input_usd_per_million)
    ) / 1000000;
    output_cost := coalesce(output_tokens_value,0) * pricing.output_usd_per_million / 1000000;
    total_cost := input_cost + output_cost;
    resolved_cost_source := 'RATE_CARD';
  end if;
  insert into public.catalog_evidence_ai_attempts (
    run_id,candidate_id,evidence_attempt_id,provider,model,prompt_version,provider_request_id,
    outcome,failure_code,identity_result,ingredient_agreement,discrepancy_codes,confidence,
    advisory_route,deterministic_conflict,latency_ms,input_tokens,cached_input_tokens,
    output_tokens,reasoning_tokens,pricing_id,input_usd_per_million,cached_input_usd_per_million,
    output_usd_per_million,estimated_input_cost_usd,estimated_output_cost_usd,
    estimated_total_cost_usd,cost_source,attempt_sha256
  ) values (
    p_run_id,candidate_id_value,planned.evidence_attempt_id,run_row.provider,run_row.model,
    run_row.prompt_version,nullif(p_attempt ->> 'providerRequestId',''),outcome_value,
    nullif(p_attempt ->> 'failureCode',''),nullif(p_attempt ->> 'identity',''),
    nullif(p_attempt ->> 'ingredientAgreement',''),coalesce(p_attempt -> 'discrepancyCodes','[]'::jsonb),
    nullif(p_attempt ->> 'confidence','')::numeric,route_value,
    coalesce((p_attempt ->> 'deterministicConflict')::boolean,true),(p_attempt ->> 'latencyMs')::integer,
    input_tokens_value,cached_tokens_value,output_tokens_value,reasoning_tokens_value,pricing.id,
    pricing.input_usd_per_million,pricing.cached_input_usd_per_million,pricing.output_usd_per_million,
    input_cost,output_cost,total_cost,resolved_cost_source,attempt_hash
  ) returning id into attempt_id_value;
  insert into public.ai_usage_ledger (
    catalog_evidence_ai_attempt_id,submission_id,attempt_ordinal,occurred_at,provider,model,
    prompt_version,provider_request_id,outcome,failure_code,latency_ms,is_retry,is_escalation,
    input_tokens,cached_input_tokens,output_tokens,reasoning_tokens,token_source,pricing_id,
    input_usd_per_million,cached_input_usd_per_million,output_usd_per_million,
    estimated_input_cost_usd,estimated_output_cost_usd,estimated_total_cost_usd,currency,cost_source
  ) values (
    attempt_id_value,null,1,pg_catalog.now(),run_row.provider,run_row.model,run_row.prompt_version,
    nullif(p_attempt ->> 'providerRequestId',''),
    case when outcome_value='ACCEPTED' then 'ACCEPTED' when outcome_value='ROUTED_TO_HUMAN' then 'LOW_CONFIDENCE' else outcome_value end,
    nullif(p_attempt ->> 'failureCode',''),(p_attempt ->> 'latencyMs')::integer,false,
    route_value='HUMAN_EXCEPTION',input_tokens_value,cached_tokens_value,output_tokens_value,
    reasoning_tokens_value,case when input_tokens_value is null and output_tokens_value is null then 'UNAVAILABLE' else 'PROVIDER_REPORTED' end,
    pricing.id,pricing.input_usd_per_million,pricing.cached_input_usd_per_million,
    pricing.output_usd_per_million,input_cost,output_cost,total_cost,coalesce(pricing.currency,'USD'),resolved_cost_source
  );
  update public.catalog_evidence_ai_runs set
    attempted_candidates = attempted_candidates + 1,
    continued_candidates = continued_candidates + case when outcome_value='ACCEPTED' then 1 else 0 end,
    human_exception_candidates = human_exception_candidates + case when outcome_value='ROUTED_TO_HUMAN' then 1 else 0 end,
    failed_candidates = failed_candidates + case when outcome_value in ('INVALID','ERROR','TIMEOUT') then 1 else 0 end,
    estimated_total_cost_usd = estimated_total_cost_usd + coalesce(total_cost,0)
  where id = p_run_id;
  insert into public.admin_audit_log (
    actor_user_id,action,entity_type,entity_id,after_json,request_id
  ) values (
    null,'CATALOG_EVIDENCE_AI_ATTEMPT_RECORDED','catalog_candidate',candidate_id_value,
    pg_catalog.jsonb_build_object('run_id',p_run_id,'attempt_id',attempt_id_value,'outcome',outcome_value,'advisory_route',route_value,'attempt_sha256',attempt_hash,'estimated_total_cost_usd',total_cost),
    'catalog-evidence-ai-' || p_run_id::text
  );
  return pg_catalog.jsonb_build_object('attemptId',attempt_id_value,'idempotent',false);
end;
$$;

create or replace function public.complete_catalog_evidence_ai_run(
  p_run_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.catalog_evidence_ai_runs%rowtype;
begin
  if p_status not in ('COMPLETED','FAILED') then
    raise exception using errcode = '22023', message = 'AI comparison completion status is invalid';
  end if;
  select * into run_row from public.catalog_evidence_ai_runs where id=p_run_id for update;
  if not found then raise exception using errcode='40001',message='AI comparison run does not exist'; end if;
  if run_row.status=p_status then return pg_catalog.jsonb_build_object('runId',p_run_id,'status',p_status,'idempotent',true); end if;
  if run_row.status <> 'STARTED' then raise exception using errcode='40001',message='AI comparison run is already closed differently'; end if;
  if p_status='COMPLETED' and run_row.attempted_candidates <> run_row.planned_candidates then
    raise exception using errcode='40001',message='completed AI comparison run must account for every candidate';
  end if;
  update public.catalog_evidence_ai_runs set status=p_status,completed_at=pg_catalog.now() where id=p_run_id;
  insert into public.admin_audit_log (
    actor_user_id,action,entity_type,entity_id,after_json,request_id
  ) values (
    null,'CATALOG_EVIDENCE_AI_RUN_CLOSED','catalog_evidence_ai_run',p_run_id,
    pg_catalog.jsonb_build_object('status',p_status,'attempted_candidates',run_row.attempted_candidates,'continued_candidates',run_row.continued_candidates,'human_exception_candidates',run_row.human_exception_candidates,'failed_candidates',run_row.failed_candidates,'estimated_total_cost_usd',run_row.estimated_total_cost_usd),
    'catalog-evidence-ai-' || p_run_id::text
  );
  return pg_catalog.jsonb_build_object('runId',p_run_id,'status',p_status,'idempotent',false);
end;
$$;

revoke all on function public.begin_catalog_evidence_ai_run(jsonb,uuid[],uuid[],text) from public,anon,authenticated;
revoke all on function public.claim_catalog_evidence_ai_slot(uuid,uuid) from public,anon,authenticated;
revoke all on function public.record_catalog_evidence_ai_attempt(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.complete_catalog_evidence_ai_run(uuid,text) from public,anon,authenticated;
grant execute on function public.begin_catalog_evidence_ai_run(jsonb,uuid[],uuid[],text) to service_role;
grant execute on function public.claim_catalog_evidence_ai_slot(uuid,uuid) to service_role;
grant execute on function public.record_catalog_evidence_ai_attempt(uuid,jsonb) to service_role;
grant execute on function public.complete_catalog_evidence_ai_run(uuid,text) to service_role;
