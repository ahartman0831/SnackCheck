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
    or p_run ->> 'algorithmVersion' <> 'school-use-v1'
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
      review_reason = 'Category-balanced staging shortlist; independent current manufacturer or package evidence is required before promotion.',
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
