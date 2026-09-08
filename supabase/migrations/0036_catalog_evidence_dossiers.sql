create table public.catalog_evidence_dossiers (
  id uuid primary key,
  candidate_id uuid not null references public.catalog_source_records(id) on delete restrict,
  dossier_sha256 text not null check (dossier_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default pg_catalog.now(),
  unique (candidate_id, dossier_sha256)
);

create table public.catalog_evidence_dossier_items (
  dossier_id uuid not null references public.catalog_evidence_dossiers(id) on delete restrict,
  evidence_attempt_id uuid not null references public.catalog_evidence_attempts(id) on delete restrict,
  evidence_role text not null check (evidence_role in ('IDENTITY','INGREDIENTS','SUPPORTING')),
  ordinal smallint not null check (ordinal between 0 and 3),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (dossier_id, evidence_attempt_id),
  unique (dossier_id, ordinal)
);

alter table public.catalog_evidence_ai_run_candidates
  add column dossier_id uuid references public.catalog_evidence_dossiers(id) on delete restrict;

alter table public.catalog_evidence_ai_run_candidates
  add constraint catalog_evidence_ai_run_candidates_dossier_evidence_fkey
  foreign key (dossier_id, evidence_attempt_id)
  references public.catalog_evidence_dossier_items(dossier_id, evidence_attempt_id)
  on delete restrict;

alter table public.catalog_evidence_ai_attempts
  add column dossier_id uuid references public.catalog_evidence_dossiers(id) on delete restrict;

alter table public.catalog_evidence_ai_attempts
  add constraint catalog_evidence_ai_attempts_dossier_evidence_fkey
  foreign key (dossier_id, evidence_attempt_id)
  references public.catalog_evidence_dossier_items(dossier_id, evidence_attempt_id)
  on delete restrict;

create index catalog_evidence_dossiers_candidate_idx
  on public.catalog_evidence_dossiers(candidate_id, created_at desc);

alter table public.catalog_evidence_dossiers enable row level security;
alter table public.catalog_evidence_dossier_items enable row level security;

revoke all on public.catalog_evidence_dossiers from public, anon, authenticated, service_role;
revoke all on public.catalog_evidence_dossier_items from public, anon, authenticated, service_role;
grant select on public.catalog_evidence_dossiers to service_role;
grant select on public.catalog_evidence_dossier_items to service_role;

create or replace function public.create_catalog_evidence_dossier(
  p_dossier jsonb,
  p_evidence_attempt_ids uuid[],
  p_evidence_roles text[],
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  dossier_id_value uuid;
  candidate_id_value uuid;
  item_count integer;
  existing_dossier public.catalog_evidence_dossiers%rowtype;
begin
  if p_confirmation <> 'ASSEMBLE_CATALOG_EVIDENCE_DOSSIER_IN_STAGING' then
    raise exception using errcode = '22023', message = 'exact staging evidence dossier confirmation is required';
  end if;
  item_count := coalesce(pg_catalog.cardinality(p_evidence_attempt_ids), 0);
  if pg_catalog.jsonb_typeof(p_dossier) is distinct from 'object'
    or coalesce(p_dossier ->> 'dossierId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_dossier ->> 'candidateId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_dossier ->> 'dossierSha256','') !~ '^[0-9a-f]{64}$'
    or item_count not between 1 and 4
    or item_count <> coalesce(pg_catalog.cardinality(p_evidence_roles), 0)
    or item_count <> (select pg_catalog.count(distinct id) from pg_catalog.unnest(p_evidence_attempt_ids) id)
    or exists (select 1 from pg_catalog.unnest(p_evidence_roles) role where role not in ('IDENTITY','INGREDIENTS','SUPPORTING')) then
    raise exception using errcode = '22023', message = 'valid bounded evidence dossier metadata is required';
  end if;
  dossier_id_value := (p_dossier ->> 'dossierId')::uuid;
  candidate_id_value := (p_dossier ->> 'candidateId')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('catalog-evidence-dossier-' || dossier_id_value::text, 0));

  select * into existing_dossier from public.catalog_evidence_dossiers where id = dossier_id_value;
  if found then
    if existing_dossier.candidate_id <> candidate_id_value
      or existing_dossier.dossier_sha256 <> p_dossier ->> 'dossierSha256'
      or (select pg_catalog.count(*) from public.catalog_evidence_dossier_items where dossier_id = dossier_id_value) <> item_count
      or exists (
        select 1
        from pg_catalog.unnest(p_evidence_attempt_ids) with ordinality requested(attempt_id, position)
        join pg_catalog.unnest(p_evidence_roles) with ordinality requested_role(role, position) using (position)
        where not exists (
          select 1 from public.catalog_evidence_dossier_items stored
          where stored.dossier_id = dossier_id_value
            and stored.evidence_attempt_id = requested.attempt_id
            and stored.evidence_role = requested_role.role
            and stored.ordinal = (requested.position - 1)::smallint
        )
      ) then
      raise exception using errcode = '40001', message = 'evidence dossier id was already used differently';
    end if;
    return pg_catalog.jsonb_build_object('dossierId', dossier_id_value, 'idempotent', true);
  end if;
  select * into existing_dossier
  from public.catalog_evidence_dossiers
  where candidate_id=candidate_id_value and dossier_sha256=p_dossier ->> 'dossierSha256';
  if found then
    return pg_catalog.jsonb_build_object('dossierId',existing_dossier.id,'idempotent',true);
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.unnest(p_evidence_attempt_ids) attempt_id
    join public.catalog_evidence_attempts evidence on evidence.id = attempt_id
    where evidence.candidate_id = candidate_id_value
      and evidence.outcome = 'EVIDENCE_FOUND'
      and evidence.source_kind in ('MANUFACTURER','SECONDARY')
      and evidence.source_url is not null
      and evidence.evidence_text is not null
  ) <> item_count then
    raise exception using errcode = '40001', message = 'dossier evidence must be successful records for one candidate';
  end if;
  if not exists (
    select 1
    from pg_catalog.unnest(p_evidence_attempt_ids) with ordinality requested(attempt_id, position)
    join pg_catalog.unnest(p_evidence_roles) with ordinality requested_role(role, position) using (position)
    join public.catalog_evidence_attempts evidence on evidence.id = requested.attempt_id
    where requested_role.role = 'INGREDIENTS'
      and evidence.source_kind = 'MANUFACTURER'
      and evidence.ingredient_text is not null
  ) then
    raise exception using errcode = '40001', message = 'dossier requires manufacturer ingredient evidence';
  end if;

  insert into public.catalog_evidence_dossiers(id,candidate_id,dossier_sha256)
  values (dossier_id_value,candidate_id_value,p_dossier ->> 'dossierSha256');
  insert into public.catalog_evidence_dossier_items(dossier_id,evidence_attempt_id,evidence_role,ordinal)
  select dossier_id_value,requested.attempt_id,requested_role.role,(requested.position - 1)::smallint
  from pg_catalog.unnest(p_evidence_attempt_ids) with ordinality requested(attempt_id, position)
  join pg_catalog.unnest(p_evidence_roles) with ordinality requested_role(role, position) using (position);
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,after_json,request_id)
  values (null,'CATALOG_EVIDENCE_DOSSIER_CREATED','catalog_evidence_dossier',dossier_id_value,
    pg_catalog.jsonb_build_object('candidate_id',candidate_id_value,'evidence_count',item_count,'dossier_sha256',p_dossier ->> 'dossierSha256'),
    'catalog-evidence-dossier-' || dossier_id_value::text);
  return pg_catalog.jsonb_build_object('dossierId',dossier_id_value,'evidenceCount',item_count,'idempotent',false);
end;
$$;

create or replace function public.begin_catalog_evidence_ai_dossier_run(
  p_run jsonb,
  p_candidate_ids uuid[],
  p_dossier_ids uuid[],
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
    or candidate_count <> coalesce(pg_catalog.cardinality(p_dossier_ids), 0)
    or candidate_count <> (select pg_catalog.count(distinct id) from pg_catalog.unnest(p_candidate_ids) id)
    or candidate_count <> (select pg_catalog.count(distinct id) from pg_catalog.unnest(p_dossier_ids) id) then
    raise exception using errcode = '22023', message = 'valid bounded AI dossier run metadata is required';
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
        from pg_catalog.unnest(p_candidate_ids) with ordinality requested(candidate_id, position)
        join pg_catalog.unnest(p_dossier_ids) with ordinality requested_dossier(dossier_id, position) using (position)
        where not exists (
          select 1 from public.catalog_evidence_ai_run_candidates stored
          where stored.run_id=run_id_value and stored.candidate_id=requested.candidate_id and stored.dossier_id=requested_dossier.dossier_id
        )
      ) then
      raise exception using errcode = '40001', message = 'AI comparison run id was already used differently';
    end if;
    return pg_catalog.jsonb_build_object('runId',run_id_value,'idempotent',true);
  end if;
  if (
    select pg_catalog.count(*)
    from pg_catalog.unnest(p_candidate_ids) with ordinality planned_candidate(candidate_id, position)
    join pg_catalog.unnest(p_dossier_ids) with ordinality planned_dossier(dossier_id, position) using (position)
    join public.catalog_source_records candidate on candidate.id = planned_candidate.candidate_id
    join public.catalog_evidence_dossiers dossier on dossier.id = planned_dossier.dossier_id and dossier.candidate_id = candidate.id
    where candidate.candidate_state = 'REVIEW_QUEUED'
      and candidate.screen_status = 'PASS'
      and candidate.catalog_automation_route = 'AUTO_EVIDENCE'
      and candidate.discontinued = false
      and (select pg_catalog.count(*) from public.catalog_evidence_dossier_items item where item.dossier_id=dossier.id) between 1 and 4
      and exists (
        select 1 from public.catalog_evidence_dossier_items item
        join public.catalog_evidence_attempts evidence on evidence.id=item.evidence_attempt_id
        where item.dossier_id=dossier.id and item.evidence_role='INGREDIENTS'
          and evidence.source_kind='MANUFACTURER' and evidence.ingredient_text is not null
      )
  ) <> candidate_count then
    raise exception using errcode = '40001', message = 'AI comparison requires eligible candidates with valid evidence dossiers';
  end if;
  insert into public.catalog_evidence_ai_runs(id,prompt_version,provider,model,selection_hash,planned_candidates)
  values (run_id_value,p_run ->> 'promptVersion',p_run ->> 'provider',p_run ->> 'model',p_run ->> 'selectionHash',candidate_count);
  insert into public.catalog_evidence_ai_run_candidates(run_id,candidate_id,evidence_attempt_id,dossier_id,ordinal)
  select run_id_value,planned_candidate.candidate_id,
    (select item.evidence_attempt_id from public.catalog_evidence_dossier_items item
      where item.dossier_id=planned_dossier.dossier_id and item.evidence_role='INGREDIENTS' order by item.ordinal limit 1),
    planned_dossier.dossier_id,(planned_candidate.position - 1)::smallint
  from pg_catalog.unnest(p_candidate_ids) with ordinality planned_candidate(candidate_id, position)
  join pg_catalog.unnest(p_dossier_ids) with ordinality planned_dossier(dossier_id, position) using (position);
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,after_json,request_id)
  values (null,'CATALOG_EVIDENCE_AI_DOSSIER_RUN_STARTED','catalog_evidence_ai_run',run_id_value,
    pg_catalog.jsonb_build_object('planned_candidates',candidate_count,'selection_hash',p_run ->> 'selectionHash','provider',p_run ->> 'provider','model',p_run ->> 'model','prompt_version',p_run ->> 'promptVersion'),
    'catalog-evidence-ai-' || run_id_value::text);
  return pg_catalog.jsonb_build_object('runId',run_id_value,'plannedCandidates',candidate_count,'idempotent',false);
end;
$$;

create or replace function public.attach_catalog_evidence_ai_dossier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select planned.dossier_id into new.dossier_id
  from public.catalog_evidence_ai_run_candidates planned
  where planned.run_id=new.run_id and planned.candidate_id=new.candidate_id;
  return new;
end;
$$;

create trigger attach_catalog_evidence_ai_dossier_before_insert
before insert on public.catalog_evidence_ai_attempts
for each row execute function public.attach_catalog_evidence_ai_dossier();

revoke all on function public.create_catalog_evidence_dossier(jsonb,uuid[],text[],text) from public, anon, authenticated;
revoke all on function public.begin_catalog_evidence_ai_dossier_run(jsonb,uuid[],uuid[],text) from public, anon, authenticated;
revoke all on function public.attach_catalog_evidence_ai_dossier() from public, anon, authenticated, service_role;
grant execute on function public.create_catalog_evidence_dossier(jsonb,uuid[],text[],text) to service_role;
grant execute on function public.begin_catalog_evidence_ai_dossier_run(jsonb,uuid[],uuid[],text) to service_role;
