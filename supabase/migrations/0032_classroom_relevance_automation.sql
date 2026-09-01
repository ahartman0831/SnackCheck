alter table public.catalog_source_records
  add column classroom_relevance_policy_version text,
  add column classroom_relevance_score smallint
    check (classroom_relevance_score between 0 and 100),
  add column classroom_relevance_tier text
    check (classroom_relevance_tier in ('HIGH', 'MEDIUM', 'LOW', 'EXCLUDED')),
  add column catalog_automation_route text
    check (catalog_automation_route in ('AUTO_EVIDENCE', 'HUMAN_EXCEPTION', 'DEPRIORITIZED')),
  add column classroom_relevance_reasons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(classroom_relevance_reasons) = 'array'),
  add column classroom_relevance_assessed_at timestamptz;

create index catalog_source_records_automation_route_idx
  on public.catalog_source_records (
    catalog_automation_route,
    classroom_relevance_tier,
    candidate_state,
    classroom_relevance_score desc
  );

create or replace function public.apply_catalog_relevance_assessments(
  p_assessments jsonb,
  p_run jsonb,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment_count integer;
  selection_hash text;
  request_id_value text;
begin
  if p_confirmation <> 'APPLY_CLASSROOM_RELEVANCE_TO_STAGING' then
    raise exception using errcode = '22023', message = 'exact staging relevance confirmation is required';
  end if;
  assessment_count := case
    when pg_catalog.jsonb_typeof(p_assessments) = 'array'
      then pg_catalog.jsonb_array_length(p_assessments)
    else 0
  end;
  if assessment_count not between 1 and 1000
    or pg_catalog.jsonb_typeof(p_run) is distinct from 'object'
    or p_run ->> 'algorithmVersion' <> 'classroom-use-v2'
    or (p_run ->> 'selectionHash') !~ '^[0-9a-f]{64}$'
    or (p_run ->> 'assessedCount')::integer is distinct from assessment_count then
    raise exception using errcode = '22023', message = 'valid relevance run metadata is required';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_assessments) assessment
    where pg_catalog.jsonb_typeof(assessment) is distinct from 'object'
      or (assessment ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or assessment ->> 'version' <> 'classroom-use-v2'
      or (assessment ->> 'score') !~ '^(0|[1-9][0-9]?|100)$'
      or assessment ->> 'tier' not in ('HIGH', 'MEDIUM', 'LOW', 'EXCLUDED')
      or assessment ->> 'route' not in ('AUTO_EVIDENCE', 'HUMAN_EXCEPTION', 'DEPRIORITIZED')
      or coalesce(assessment ->> 'group', '') not in ('', 'SNACKS', 'BREAKFAST', 'LUNCHBOX', 'DRINKS', 'TREATS')
      or pg_catalog.jsonb_typeof(assessment -> 'reasons') is distinct from 'array'
      or pg_catalog.jsonb_array_length(assessment -> 'reasons') = 0
      or exists (
        select 1 from pg_catalog.jsonb_array_elements(assessment -> 'reasons') reason
        where pg_catalog.jsonb_typeof(reason) <> 'string'
      )
      or case assessment ->> 'tier'
        when 'HIGH' then (assessment ->> 'score')::integer not between 70 and 100
        when 'MEDIUM' then (assessment ->> 'score')::integer not between 50 and 69
        when 'LOW' then (assessment ->> 'score')::integer not between 1 and 49
        when 'EXCLUDED' then (assessment ->> 'score')::integer <> 0
        else true
      end
  ) then
    raise exception using errcode = '22023', message = 'every relevance assessment must be valid';
  end if;
  if (
    select pg_catalog.count(distinct (assessment ->> 'id')::uuid)
    from pg_catalog.jsonb_array_elements(p_assessments) assessment
  ) <> assessment_count then
    raise exception using errcode = '22023', message = 'relevance assessments must contain unique candidates';
  end if;
  if (
    select pg_catalog.count(*)
    from public.catalog_source_records
    where id in (
      select (assessment ->> 'id')::uuid
      from pg_catalog.jsonb_array_elements(p_assessments) assessment
    )
  ) <> assessment_count then
    raise exception using errcode = '40001', message = 'relevance assessment contains an unknown candidate';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_assessments) assessment
    join public.catalog_source_records candidate
      on candidate.id = (assessment ->> 'id')::uuid
    where assessment ->> 'route' = 'AUTO_EVIDENCE'
      and (
        candidate.discontinued
        or candidate.screen_status <> 'PASS'
        or candidate.quality_flags <> '[]'::jsonb
        or assessment ->> 'tier' not in ('HIGH', 'MEDIUM')
      )
  ) then
    raise exception using errcode = '40001', message = 'only clean passing candidates can use automated evidence routing';
  end if;

  selection_hash := p_run ->> 'selectionHash';
  request_id_value := 'catalog-relevance-' || pg_catalog.left(selection_hash, 32);
  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  )
  select null, 'CATALOG_RELEVANCE_ASSESSED', 'catalog_candidate', candidate.id,
    pg_catalog.jsonb_build_object(
      'policy_version', candidate.classroom_relevance_policy_version,
      'score', candidate.classroom_relevance_score,
      'tier', candidate.classroom_relevance_tier,
      'route', candidate.catalog_automation_route
    ),
    pg_catalog.jsonb_build_object(
      'policy_version', assessment ->> 'version',
      'score', (assessment ->> 'score')::integer,
      'tier', assessment ->> 'tier',
      'route', assessment ->> 'route',
      'group', nullif(assessment ->> 'group', ''),
      'reasons', assessment -> 'reasons'
    ),
    request_id_value
  from pg_catalog.jsonb_array_elements(p_assessments) assessment
  join public.catalog_source_records candidate
    on candidate.id = (assessment ->> 'id')::uuid;

  with parsed as (
    select
      (assessment ->> 'id')::uuid as id,
      assessment ->> 'version' as policy_version,
      (assessment ->> 'score')::smallint as score,
      assessment ->> 'tier' as tier,
      assessment ->> 'route' as route,
      assessment -> 'reasons' as reasons
    from pg_catalog.jsonb_array_elements(p_assessments) assessment
  )
  update public.catalog_source_records candidate
  set classroom_relevance_policy_version = parsed.policy_version,
      classroom_relevance_score = parsed.score,
      classroom_relevance_tier = parsed.tier,
      catalog_automation_route = parsed.route,
      classroom_relevance_reasons = parsed.reasons,
      classroom_relevance_assessed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  from parsed
  where candidate.id = parsed.id;

  return pg_catalog.jsonb_build_object(
    'assessedCount', assessment_count,
    'selectionHash', selection_hash,
    'algorithmVersion', 'classroom-use-v2'
  );
end;
$$;

revoke all on function public.apply_catalog_relevance_assessments(jsonb, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.apply_catalog_relevance_assessments(jsonb, jsonb, text)
  to service_role;

create or replace function public.queue_catalog_candidate_shortlist(
  p_candidate_ids uuid[],
  p_run jsonb,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_row record;
  candidate_count integer := 0;
  selection_hash text;
  request_id_value text;
begin
  if p_confirmation <> 'QUEUE_CATALOG_SHORTLIST_TO_STAGING' then
    raise exception using errcode = '22023', message = 'exact staging shortlist confirmation is required';
  end if;
  if pg_catalog.jsonb_typeof(p_run) is distinct from 'object'
    or p_run ->> 'algorithmVersion' <> 'classroom-use-v2'
    or (p_run ->> 'selectionHash') !~ '^[0-9a-f]{64}$'
    or (p_run ->> 'targetCount')::integer is distinct from pg_catalog.cardinality(p_candidate_ids)
    or pg_catalog.jsonb_typeof(p_run -> 'groupCounts') is distinct from 'object'
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(p_run -> 'groupCounts') group_name
      where group_name not in ('SNACKS', 'BREAKFAST', 'LUNCHBOX', 'DRINKS', 'TREATS')
    )
    or (
      select pg_catalog.sum(group_count::integer)
      from pg_catalog.jsonb_each_text(p_run -> 'groupCounts') groups(group_name, group_count)
    ) is distinct from pg_catalog.cardinality(p_candidate_ids) then
    raise exception using errcode = '22023', message = 'valid shortlist run metadata is required';
  end if;
  if pg_catalog.cardinality(p_candidate_ids) not between 1 and 200
    or (select pg_catalog.count(distinct candidate_id) from pg_catalog.unnest(p_candidate_ids) candidate_id)
      <> pg_catalog.cardinality(p_candidate_ids) then
    raise exception using errcode = '22023', message = 'shortlist must contain 1 to 200 unique candidates';
  end if;

  for candidate_row in
    select id
    from public.catalog_source_records
    where id = any(p_candidate_ids)
      and candidate_state = 'SCREENED_PASS'
      and screen_status = 'PASS'
      and discontinued = false
      and quality_flags = '[]'::jsonb
      and classroom_relevance_policy_version = 'classroom-use-v2'
      and classroom_relevance_tier = 'HIGH'
      and catalog_automation_route = 'AUTO_EVIDENCE'
    for update
  loop
    candidate_count := candidate_count + 1;
  end loop;
  if candidate_count <> pg_catalog.cardinality(p_candidate_ids) then
    raise exception using errcode = '40001', message = 'shortlist contains an ineligible or changed candidate';
  end if;

  selection_hash := p_run ->> 'selectionHash';
  request_id_value := 'catalog-shortlist-' || pg_catalog.left(selection_hash, 32);
  update public.catalog_source_records
  set candidate_state = 'REVIEW_QUEUED',
      review_reason = 'Classroom-relevant candidate routed to automated independent evidence collection; human review is required only for exceptions or quality sampling.',
      reviewed_by = null,
      reviewed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = any(p_candidate_ids);

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  )
  select null, 'CATALOG_CANDIDATE_SHORTLIST_QUEUED', 'catalog_candidate', candidate_id,
    pg_catalog.jsonb_build_object('candidate_state', 'SCREENED_PASS'),
    pg_catalog.jsonb_build_object(
      'candidate_state', 'REVIEW_QUEUED',
      'selection_hash', selection_hash,
      'algorithm_version', p_run ->> 'algorithmVersion',
      'automation_route', 'AUTO_EVIDENCE',
      'independent_evidence_required', true
    ),
    request_id_value
  from pg_catalog.unnest(p_candidate_ids) candidate_id;

  return pg_catalog.jsonb_build_object(
    'queuedCount', candidate_count,
    'selectionHash', selection_hash,
    'algorithmVersion', p_run ->> 'algorithmVersion'
  );
end;
$$;

revoke all on function public.queue_catalog_candidate_shortlist(uuid[], jsonb, text)
  from public, anon, authenticated;
grant execute on function public.queue_catalog_candidate_shortlist(uuid[], jsonb, text)
  to service_role;
