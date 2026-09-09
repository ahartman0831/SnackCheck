create table public.catalog_evidence_runs (
  id uuid primary key,
  collector_version text not null check (length(btrim(collector_version)) between 1 and 80),
  source_policy_version text not null check (length(btrim(source_policy_version)) between 1 and 80),
  selection_hash text not null check (selection_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'STARTED' check (status in ('STARTED', 'COMPLETED', 'FAILED')),
  planned_candidates smallint not null check (planned_candidates between 1 and 100),
  attempted_candidates smallint not null default 0 check (attempted_candidates between 0 and 100),
  evidence_found smallint not null default 0 check (evidence_found between 0 and 100),
  not_found smallint not null default 0 check (not_found between 0 and 100),
  blocked smallint not null default 0 check (blocked between 0 and 100),
  failed smallint not null default 0 check (failed between 0 and 100),
  max_requests_per_candidate smallint not null check (max_requests_per_candidate between 1 and 5),
  max_requests_per_run smallint not null check (max_requests_per_run between 1 and 500),
  max_response_bytes integer not null check (max_response_bytes between 1 and 5000000),
  request_count integer not null default 0 check (request_count between 0 and 500),
  retrieved_bytes bigint not null default 0 check (retrieved_bytes >= 0),
  started_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  check (attempted_candidates = evidence_found + not_found + blocked + failed),
  check (attempted_candidates <= planned_candidates),
  check (request_count <= max_requests_per_run),
  check (
    (status = 'STARTED' and completed_at is null)
    or (status in ('COMPLETED', 'FAILED') and completed_at is not null)
  ),
  check (status <> 'COMPLETED' or attempted_candidates = planned_candidates)
);

create table public.catalog_evidence_run_candidates (
  run_id uuid not null references public.catalog_evidence_runs(id) on delete restrict,
  candidate_id uuid not null references public.catalog_source_records(id) on delete restrict,
  ordinal smallint not null check (ordinal between 0 and 99),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (run_id, candidate_id),
  unique (run_id, ordinal)
);

create table public.catalog_evidence_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.catalog_evidence_runs(id) on delete restrict,
  candidate_id uuid not null references public.catalog_source_records(id) on delete restrict,
  outcome text not null check (outcome in (
    'EVIDENCE_FOUND', 'NOT_FOUND', 'BLOCKED_BY_POLICY',
    'REQUEST_LIMIT_REACHED', 'TIMEOUT', 'ERROR'
  )),
  reason_code text not null check (reason_code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  request_count smallint not null check (request_count between 0 and 5),
  source_kind text check (source_kind in ('MANUFACTURER', 'SECONDARY')),
  source_url text check (source_url is null or source_url ~ '^https://'),
  source_host text check (source_host is null or length(btrim(source_host)) between 1 and 253),
  evidence_title text check (evidence_title is null or length(btrim(evidence_title)) between 1 and 500),
  retrieved_at timestamptz,
  observed_at timestamptz,
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  byte_size integer check (byte_size is null or byte_size between 0 and 5000000),
  media_type text check (media_type is null or media_type in (
    'application/json', 'image/jpeg', 'image/png', 'image/webp', 'text/html', 'text/plain'
  )),
  license_identifier text check (license_identifier is null or length(btrim(license_identifier)) between 1 and 120),
  attribution text check (attribution is null or length(attribution) <= 1000),
  ingredient_text text check (ingredient_text is null or length(ingredient_text) <= 10000),
  evidence_text text check (evidence_text is null or length(evidence_text) <= 50000),
  attempt_sha256 text not null check (attempt_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default pg_catalog.now(),
  unique (run_id, candidate_id),
  check (
    (outcome = 'EVIDENCE_FOUND'
      and source_kind is not null
      and source_url is not null
      and source_host is not null
      and evidence_title is not null
      and retrieved_at is not null
      and content_sha256 is not null
      and byte_size is not null
      and media_type is not null
      and evidence_text is not null)
    or (outcome <> 'EVIDENCE_FOUND'
      and source_kind is null
      and source_url is null
      and source_host is null
      and evidence_title is null
      and retrieved_at is null
      and observed_at is null
      and content_sha256 is null
      and byte_size is null
      and media_type is null
      and license_identifier is null
      and attribution is null
      and ingredient_text is null
      and evidence_text is null)
  )
);

create index catalog_evidence_runs_status_idx
  on public.catalog_evidence_runs (status, started_at desc);
create index catalog_evidence_attempts_candidate_idx
  on public.catalog_evidence_attempts (candidate_id, created_at desc);
create index catalog_evidence_attempts_outcome_idx
  on public.catalog_evidence_attempts (outcome, created_at desc);

alter table public.catalog_evidence_runs enable row level security;
alter table public.catalog_evidence_run_candidates enable row level security;
alter table public.catalog_evidence_attempts enable row level security;

revoke all on public.catalog_evidence_runs from public, anon, authenticated;
revoke all on public.catalog_evidence_run_candidates from public, anon, authenticated;
revoke all on public.catalog_evidence_attempts from public, anon, authenticated;
revoke all on public.catalog_evidence_runs from service_role;
revoke all on public.catalog_evidence_run_candidates from service_role;
revoke all on public.catalog_evidence_attempts from service_role;
grant select on public.catalog_evidence_runs to service_role;
grant select on public.catalog_evidence_run_candidates to service_role;
grant select on public.catalog_evidence_attempts to service_role;

create or replace function public.begin_catalog_evidence_run(
  p_run jsonb,
  p_candidate_ids uuid[],
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
  existing_run public.catalog_evidence_runs%rowtype;
begin
  if p_confirmation <> 'COLLECT_CATALOG_EVIDENCE_TO_STAGING' then
    raise exception using errcode = '22023', message = 'exact staging evidence confirmation is required';
  end if;
  candidate_count := coalesce(pg_catalog.cardinality(p_candidate_ids), 0);
  if pg_catalog.jsonb_typeof(p_run) is distinct from 'object'
    or coalesce(p_run ->> 'runId', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_run ->> 'collectorVersion' <> 'catalog-evidence-v1'
    or p_run ->> 'sourcePolicyVersion' <> 'evidence-source-v1'
    or coalesce(p_run ->> 'selectionHash', '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_run ->> 'maxRequestsPerCandidate', '') !~ '^[1-5]$'
    or coalesce(p_run ->> 'maxRequestsPerRun', '') !~ '^[1-9][0-9]{0,2}$'
    or (p_run ->> 'maxRequestsPerRun')::integer > 500
    or coalesce(p_run ->> 'maxResponseBytes', '') !~ '^[1-9][0-9]{0,6}$'
    or (p_run ->> 'maxResponseBytes')::integer > 5000000
    or candidate_count not between 1 and 100
    or candidate_count <> (select pg_catalog.count(distinct candidate_id) from pg_catalog.unnest(p_candidate_ids) candidate_id) then
    raise exception using errcode = '22023', message = 'valid bounded evidence run metadata is required';
  end if;
  run_id_value := (p_run ->> 'runId')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('catalog-evidence-' || run_id_value::text, 0));

  select * into existing_run from public.catalog_evidence_runs where id = run_id_value;
  if found then
    if existing_run.collector_version <> p_run ->> 'collectorVersion'
      or existing_run.source_policy_version <> p_run ->> 'sourcePolicyVersion'
      or existing_run.selection_hash <> p_run ->> 'selectionHash'
      or existing_run.planned_candidates <> candidate_count
      or existing_run.max_requests_per_candidate <> (p_run ->> 'maxRequestsPerCandidate')::smallint
      or existing_run.max_requests_per_run <> (p_run ->> 'maxRequestsPerRun')::smallint
      or existing_run.max_response_bytes <> (p_run ->> 'maxResponseBytes')::integer
      or exists (
        select 1 from public.catalog_evidence_run_candidates planned
        where planned.run_id = run_id_value and planned.candidate_id <> all(p_candidate_ids)
      )
      or (select pg_catalog.count(*) from public.catalog_evidence_run_candidates where run_id = run_id_value) <> candidate_count then
      raise exception using errcode = '40001', message = 'evidence run id was already used for a different selection';
    end if;
    return pg_catalog.jsonb_build_object(
      'runId', run_id_value, 'plannedCandidates', candidate_count,
      'selectionHash', existing_run.selection_hash, 'idempotent', true
    );
  end if;

  perform candidate.id
  from public.catalog_source_records candidate
  where candidate.id = any(p_candidate_ids)
  order by candidate.id
  for update;
  if (
    select pg_catalog.count(*)
    from public.catalog_source_records candidate
    where candidate.id = any(p_candidate_ids)
      and candidate.candidate_state = 'REVIEW_QUEUED'
      and candidate.screen_status = 'PASS'
      and candidate.discontinued = false
      and candidate.quality_flags = '[]'::jsonb
      and candidate.classroom_relevance_policy_version = 'classroom-use-v2'
      and candidate.catalog_automation_route = 'AUTO_EVIDENCE'
  ) <> candidate_count then
    raise exception using errcode = '40001', message = 'evidence run contains an ineligible or changed candidate';
  end if;

  insert into public.catalog_evidence_runs (
    id, collector_version, source_policy_version, selection_hash, planned_candidates,
    max_requests_per_candidate, max_requests_per_run, max_response_bytes
  ) values (
    run_id_value, p_run ->> 'collectorVersion', p_run ->> 'sourcePolicyVersion',
    p_run ->> 'selectionHash', candidate_count,
    (p_run ->> 'maxRequestsPerCandidate')::smallint,
    (p_run ->> 'maxRequestsPerRun')::smallint,
    (p_run ->> 'maxResponseBytes')::integer
  );
  insert into public.catalog_evidence_run_candidates (run_id, candidate_id, ordinal)
  select run_id_value, candidate_id, (ordinality - 1)::smallint
  from pg_catalog.unnest(p_candidate_ids) with ordinality planned(candidate_id, ordinality);
  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, after_json, request_id
  ) values (
    null, 'CATALOG_EVIDENCE_RUN_STARTED', 'catalog_evidence_run', run_id_value,
    pg_catalog.jsonb_build_object(
      'planned_candidates', candidate_count,
      'selection_hash', p_run ->> 'selectionHash',
      'collector_version', p_run ->> 'collectorVersion',
      'source_policy_version', p_run ->> 'sourcePolicyVersion'
    ), 'catalog-evidence-' || run_id_value::text
  );
  return pg_catalog.jsonb_build_object(
    'runId', run_id_value, 'plannedCandidates', candidate_count,
    'selectionHash', p_run ->> 'selectionHash', 'idempotent', false
  );
end;
$$;

create or replace function public.record_catalog_evidence_attempt(
  p_run_id uuid,
  p_attempt jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.catalog_evidence_runs%rowtype;
  existing_attempt public.catalog_evidence_attempts%rowtype;
  candidate_id_value uuid;
  outcome_value text;
  request_count_value smallint;
  byte_size_value integer;
  attempt_hash text;
  attempt_id_value uuid;
  found_increment smallint := 0;
  not_found_increment smallint := 0;
  blocked_increment smallint := 0;
  failed_increment smallint := 0;
begin
  if pg_catalog.jsonb_typeof(p_attempt) is distinct from 'object'
    or coalesce(p_attempt ->> 'candidateId', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_attempt ->> 'outcome' not in ('EVIDENCE_FOUND','NOT_FOUND','BLOCKED_BY_POLICY','REQUEST_LIMIT_REACHED','TIMEOUT','ERROR')
    or coalesce(p_attempt ->> 'reasonCode', '') !~ '^[A-Z][A-Z0-9_]{1,79}$'
    or coalesce(p_attempt ->> 'requestCount', '') !~ '^[0-5]$' then
    raise exception using errcode = '22023', message = 'valid evidence attempt metadata is required';
  end if;
  candidate_id_value := (p_attempt ->> 'candidateId')::uuid;
  outcome_value := p_attempt ->> 'outcome';
  request_count_value := (p_attempt ->> 'requestCount')::smallint;
  byte_size_value := case when outcome_value = 'EVIDENCE_FOUND' then (p_attempt #>> '{evidence,byteSize}')::integer else 0 end;
  attempt_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_attempt::text, 'utf8'), 'sha256'), 'hex'
  );

  select * into run_row from public.catalog_evidence_runs where id = p_run_id for update;
  if not found or run_row.status <> 'STARTED' then
    raise exception using errcode = '40001', message = 'evidence run is missing or no longer open';
  end if;
  if not exists (
    select 1 from public.catalog_evidence_run_candidates
    where run_id = p_run_id and candidate_id = candidate_id_value
  ) then
    raise exception using errcode = '40001', message = 'candidate is not part of this evidence run';
  end if;
  select * into existing_attempt
  from public.catalog_evidence_attempts
  where run_id = p_run_id and candidate_id = candidate_id_value;
  if found then
    if existing_attempt.attempt_sha256 <> attempt_hash then
      raise exception using errcode = '40001', message = 'candidate already has a different evidence outcome for this run';
    end if;
    return pg_catalog.jsonb_build_object(
      'attemptId', existing_attempt.id, 'candidateId', candidate_id_value, 'idempotent', true
    );
  end if;
  if request_count_value > run_row.max_requests_per_candidate
    or run_row.request_count + request_count_value > run_row.max_requests_per_run
    or byte_size_value > run_row.max_response_bytes then
    raise exception using errcode = '22023', message = 'evidence attempt exceeds the run budget';
  end if;
  if outcome_value = 'EVIDENCE_FOUND' and (
    pg_catalog.jsonb_typeof(p_attempt -> 'evidence') is distinct from 'object'
    or p_attempt #>> '{evidence,sourceKind}' not in ('MANUFACTURER','SECONDARY')
    or coalesce(p_attempt #>> '{evidence,url}', '') !~ '^https://'
    or length(pg_catalog.btrim(coalesce(p_attempt #>> '{evidence,hostname}', ''))) not between 1 and 253
    or length(pg_catalog.btrim(coalesce(p_attempt #>> '{evidence,title}', ''))) not between 1 and 500
    or coalesce(p_attempt #>> '{evidence,retrievedAt}', '') = ''
    or coalesce(p_attempt #>> '{evidence,contentSha256}', '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_attempt #>> '{evidence,byteSize}', '') !~ '^(0|[1-9][0-9]{0,6})$'
    or p_attempt #>> '{evidence,mediaType}' not in ('application/json','image/jpeg','image/png','image/webp','text/html','text/plain')
    or length(coalesce(p_attempt #>> '{evidence,evidenceText}', '')) > 50000
    or length(coalesce(p_attempt #>> '{evidence,ingredientText}', '')) > 10000
  ) then
    raise exception using errcode = '22023', message = 'complete evidence metadata is required for a found outcome';
  end if;
  if outcome_value <> 'EVIDENCE_FOUND' and p_attempt ? 'evidence' and p_attempt -> 'evidence' <> 'null'::jsonb then
    raise exception using errcode = '22023', message = 'non-evidence outcomes cannot carry evidence';
  end if;

  insert into public.catalog_evidence_attempts (
    run_id, candidate_id, outcome, reason_code, request_count,
    source_kind, source_url, source_host, evidence_title, retrieved_at, observed_at,
    content_sha256, byte_size, media_type, license_identifier, attribution,
    ingredient_text, evidence_text, attempt_sha256
  ) values (
    p_run_id, candidate_id_value, outcome_value, p_attempt ->> 'reasonCode', request_count_value,
    p_attempt #>> '{evidence,sourceKind}', p_attempt #>> '{evidence,url}',
    p_attempt #>> '{evidence,hostname}', p_attempt #>> '{evidence,title}',
    nullif(p_attempt #>> '{evidence,retrievedAt}', '')::timestamptz,
    nullif(p_attempt #>> '{evidence,observedAt}', '')::timestamptz,
    p_attempt #>> '{evidence,contentSha256}',
    nullif(p_attempt #>> '{evidence,byteSize}', '')::integer,
    p_attempt #>> '{evidence,mediaType}', p_attempt #>> '{evidence,licenseIdentifier}',
    p_attempt #>> '{evidence,attribution}', p_attempt #>> '{evidence,ingredientText}',
    p_attempt #>> '{evidence,evidenceText}', attempt_hash
  ) returning id into attempt_id_value;

  found_increment := case when outcome_value = 'EVIDENCE_FOUND' then 1 else 0 end;
  not_found_increment := case when outcome_value = 'NOT_FOUND' then 1 else 0 end;
  blocked_increment := case when outcome_value in ('BLOCKED_BY_POLICY','REQUEST_LIMIT_REACHED') then 1 else 0 end;
  failed_increment := case when outcome_value in ('TIMEOUT','ERROR') then 1 else 0 end;
  update public.catalog_evidence_runs
  set attempted_candidates = attempted_candidates + 1,
      evidence_found = evidence_found + found_increment,
      not_found = not_found + not_found_increment,
      blocked = blocked + blocked_increment,
      failed = failed + failed_increment,
      request_count = request_count + request_count_value,
      retrieved_bytes = retrieved_bytes + byte_size_value
  where id = p_run_id;
  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, after_json, request_id
  ) values (
    null, 'CATALOG_EVIDENCE_ATTEMPT_RECORDED', 'catalog_candidate', candidate_id_value,
    pg_catalog.jsonb_build_object(
      'run_id', p_run_id, 'attempt_id', attempt_id_value,
      'outcome', outcome_value, 'reason_code', p_attempt ->> 'reasonCode',
      'request_count', request_count_value, 'attempt_sha256', attempt_hash
    ), 'catalog-evidence-' || p_run_id::text
  );
  return pg_catalog.jsonb_build_object(
    'attemptId', attempt_id_value, 'candidateId', candidate_id_value, 'idempotent', false
  );
end;
$$;

create or replace function public.complete_catalog_evidence_run(
  p_run_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.catalog_evidence_runs%rowtype;
begin
  if p_status not in ('COMPLETED','FAILED') then
    raise exception using errcode = '22023', message = 'evidence run completion status is invalid';
  end if;
  select * into run_row from public.catalog_evidence_runs where id = p_run_id for update;
  if not found then
    raise exception using errcode = '40001', message = 'evidence run does not exist';
  end if;
  if run_row.status = p_status then
    return pg_catalog.jsonb_build_object('runId', p_run_id, 'status', p_status, 'idempotent', true);
  end if;
  if run_row.status <> 'STARTED' then
    raise exception using errcode = '40001', message = 'evidence run is already closed differently';
  end if;
  if p_status = 'COMPLETED' and run_row.attempted_candidates <> run_row.planned_candidates then
    raise exception using errcode = '40001', message = 'completed evidence run must account for every planned candidate';
  end if;
  update public.catalog_evidence_runs
  set status = p_status, completed_at = pg_catalog.now()
  where id = p_run_id;
  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, after_json, request_id
  ) values (
    null, 'CATALOG_EVIDENCE_RUN_CLOSED', 'catalog_evidence_run', p_run_id,
    pg_catalog.jsonb_build_object(
      'status', p_status, 'attempted_candidates', run_row.attempted_candidates,
      'evidence_found', run_row.evidence_found, 'not_found', run_row.not_found,
      'blocked', run_row.blocked, 'failed', run_row.failed,
      'request_count', run_row.request_count, 'retrieved_bytes', run_row.retrieved_bytes
    ), 'catalog-evidence-' || p_run_id::text
  );
  return pg_catalog.jsonb_build_object('runId', p_run_id, 'status', p_status, 'idempotent', false);
end;
$$;

revoke all on function public.begin_catalog_evidence_run(jsonb, uuid[], text) from public, anon, authenticated;
revoke all on function public.record_catalog_evidence_attempt(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.complete_catalog_evidence_run(uuid, text) from public, anon, authenticated;
grant execute on function public.begin_catalog_evidence_run(jsonb, uuid[], text) to service_role;
grant execute on function public.record_catalog_evidence_attempt(uuid, jsonb) to service_role;
grant execute on function public.complete_catalog_evidence_run(uuid, text) to service_role;
