-- Informational screening: one active authorized admin may approve and publish.
-- No rules, aliases, sources, roles or publication state are changed by this migration.
-- Preserve sourced/hash-checked snapshots, optional review, auditing and clone-based rollback.

create or replace function public.ruleset_publication_blockers(target_ruleset_id uuid)
returns text[]
language plpgsql
stable
as $$
declare
  blockers text[] := '{}';
  ruleset public.rulesets%rowtype;
  source_count integer;
  substance_count integer;
  missing_substance_provenance integer;
  bad_aliases integer;
  missing_context_provenance integer;
  expected_hash text;
begin
  select * into ruleset from public.rulesets where id = target_ruleset_id;
  if not found then
    return array['ruleset does not exist'];
  end if;

  if ruleset.effective_from is null then
    blockers := array_append(blockers, 'effective_from is required');
  end if;

  select count(*) into source_count
  from public.regulatory_sources s
  where s.jurisdiction_id = ruleset.jurisdiction_id
    and s.active
    and s.source_type in ('STATUTE', 'AGENCY_GUIDANCE');
  if source_count < 1 then
    blockers := array_append(blockers, 'at least one active primary source is required');
  end if;

  select count(*) into substance_count
  from public.prohibited_substances
  where ruleset_id = target_ruleset_id
    and enabled;
  if substance_count <> 11 then
    blockers := array_append(blockers, 'exactly 11 enabled statutory substances are required');
  end if;

  select count(*) into missing_substance_provenance
  from public.prohibited_substances
  where ruleset_id = target_ruleset_id
    and enabled
    and (regulatory_source_id is null or coalesce(btrim(source_locator), '') = '');
  if missing_substance_provenance > 0 then
    blockers := array_append(blockers, 'every enabled substance must have source provenance');
  end if;

  select count(*) into bad_aliases
  from public.rule_aliases a
  join public.prohibited_substances s on s.id = a.prohibited_substance_id
  where s.ruleset_id = target_ruleset_id
    and a.enabled
    and (
      a.review_status not in ('EXACT_STATUTE_TERM', 'AUTHORITATIVE_SYNONYM', 'EXPERT_VERIFIED')
      or a.regulatory_source_id is null
    );
  if bad_aliases > 0 then
    blockers := array_append(blockers, 'every enabled alias must be approved and sourced');
  end if;

  select count(*) into missing_context_provenance
  from public.ruleset_contexts
  where ruleset_id = target_ruleset_id
    and enabled
    and (regulatory_source_id is null or coalesce(btrim(source_locator), '') = '');
  if missing_context_provenance > 0 then
    blockers := array_append(blockers, 'every enabled context must have source provenance');
  end if;

  expected_hash := public.ruleset_canonical_hash(target_ruleset_id);
  if ruleset.ruleset_hash is null or ruleset.ruleset_hash <> expected_hash then
    blockers := array_append(blockers, 'canonical ruleset hash must be populated');
  end if;

  -- Review is optional. A recorded review must still be complete and attributable.
  if (ruleset.reviewed_by is not null or ruleset.reviewed_at is not null
      or ruleset.review_document_url is not null or ruleset.review_document_hash is not null)
    and (ruleset.reviewed_by is null or ruleset.reviewed_at is null
      or coalesce(ruleset.review_document_url, '') !~ '^https://[^[:space:]]+$'
      or coalesce(ruleset.review_document_hash, '') !~ '^[0-9a-f]{64}$') then
    blockers := array_append(blockers, 'optional review must include reviewer, timestamp, HTTPS document and SHA-256');
  end if;

  if ruleset.published_by is null then
    blockers := array_append(blockers, 'publisher is required');
  end if;

  return blockers;
end;
$$;

create or replace function public.enforce_ruleset_publication_requirements()
returns trigger
language plpgsql
as $$
declare
  blockers text[] := '{}';
  source_count integer;
  substance_count integer;
  missing_substance_provenance integer;
  bad_aliases integer;
  missing_context_provenance integer;
  expected_hash text;
begin
  if not new.is_published then
    return new;
  end if;

  if new.effective_from is null then
    blockers := array_append(blockers, 'effective_from is required');
  end if;

  select count(*) into source_count
  from public.regulatory_sources s
  where s.jurisdiction_id = new.jurisdiction_id
    and s.active
    and s.source_type in ('STATUTE', 'AGENCY_GUIDANCE');
  if source_count < 1 then
    blockers := array_append(blockers, 'at least one active primary source is required');
  end if;

  select count(*) into substance_count
  from public.prohibited_substances
  where ruleset_id = new.id
    and enabled;
  if substance_count <> 11 then
    blockers := array_append(blockers, 'exactly 11 enabled statutory substances are required');
  end if;

  select count(*) into missing_substance_provenance
  from public.prohibited_substances
  where ruleset_id = new.id
    and enabled
    and (regulatory_source_id is null or coalesce(btrim(source_locator), '') = '');
  if missing_substance_provenance > 0 then
    blockers := array_append(blockers, 'every enabled substance must have source provenance');
  end if;

  select count(*) into bad_aliases
  from public.rule_aliases a
  join public.prohibited_substances s on s.id = a.prohibited_substance_id
  where s.ruleset_id = new.id
    and a.enabled
    and (
      a.review_status not in ('EXACT_STATUTE_TERM', 'AUTHORITATIVE_SYNONYM', 'EXPERT_VERIFIED')
      or a.regulatory_source_id is null
    );
  if bad_aliases > 0 then
    blockers := array_append(blockers, 'every enabled alias must be approved and sourced');
  end if;

  select count(*) into missing_context_provenance
  from public.ruleset_contexts
  where ruleset_id = new.id
    and enabled
    and (regulatory_source_id is null or coalesce(btrim(source_locator), '') = '');
  if missing_context_provenance > 0 then
    blockers := array_append(blockers, 'every enabled context must have source provenance');
  end if;

  expected_hash := public.ruleset_canonical_hash(new.id);
  if new.ruleset_hash is null or new.ruleset_hash <> expected_hash then
    blockers := array_append(blockers, 'canonical ruleset hash must be populated');
  end if;

  -- Review is optional. A recorded review must still be complete and attributable.
  if (new.reviewed_by is not null or new.reviewed_at is not null
      or new.review_document_url is not null or new.review_document_hash is not null)
    and (new.reviewed_by is null or new.reviewed_at is null
      or coalesce(new.review_document_url, '') !~ '^https://[^[:space:]]+$'
      or coalesce(new.review_document_hash, '') !~ '^[0-9a-f]{64}$') then
    blockers := array_append(blockers, 'optional review must include reviewer, timestamp, HTTPS document and SHA-256');
  end if;

  if new.published_by is null then
    blockers := array_append(blockers, 'publisher is required');
  end if;

  if coalesce(array_length(blockers, 1), 0) > 0 then
    raise exception 'ruleset publication requirements are not met';
  end if;

  return new;
end;
$$;

create or replace function public.admin_publish_ruleset(
  p_ruleset_id uuid,
  p_expected_hash text,
  p_expected_reviewed_at timestamptz,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  before_row public.rulesets%rowtype;
  after_row public.rulesets%rowtype;
begin
  if actor_id is null
    or not public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active regulatory administrator access is required';
  end if;
  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;

  select * into before_row from public.rulesets
  where id = p_ruleset_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ruleset does not exist';
  end if;
  if before_row.is_published then
    raise exception using errcode = '40001', message = 'ruleset changed; refresh before publishing';
  end if;
  if before_row.ruleset_hash is distinct from p_expected_hash
    or public.ruleset_canonical_hash(before_row.id) is distinct from p_expected_hash
    or before_row.reviewed_at is distinct from p_expected_reviewed_at then
    raise exception using errcode = '40001', message = 'ruleset changed; refresh before publishing';
  end if;

  perform public.publish_ruleset(before_row.id, actor_id);
  select * into after_row from public.rulesets where id = before_row.id;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id, 'RULESET_PUBLISHED', 'ruleset', before_row.id,
    jsonb_build_object('ruleset_hash', before_row.ruleset_hash, 'reviewed_by', before_row.reviewed_by, 'reviewed_at', before_row.reviewed_at, 'is_published', before_row.is_published),
    jsonb_build_object('ruleset_hash', after_row.ruleset_hash, 'published_by', after_row.published_by, 'published_at', after_row.published_at, 'is_published', after_row.is_published, 'approval_mode', 'ADMIN_APPROVED', 'independent_review_required', false),
    p_request_id
  );

  return jsonb_build_object('ruleset_id', after_row.id, 'ruleset_hash', after_row.ruleset_hash, 'published_at', after_row.published_at);
end;
$$;

create or replace function public.enforce_published_ruleset_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.is_published then
    if new.code is distinct from old.code
      or new.version is distinct from old.version
      or new.title is distinct from old.title
      or new.effective_from is distinct from old.effective_from
      or new.jurisdiction_id is distinct from old.jurisdiction_id
      or new.ruleset_hash is distinct from old.ruleset_hash
      or new.freshness_current_days is distinct from old.freshness_current_days
      or new.freshness_aging_days is distinct from old.freshness_aging_days
      or new.is_published is distinct from old.is_published
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.published_by is distinct from old.published_by
      or new.published_at is distinct from old.published_at
      or new.review_document_url is distinct from old.review_document_url
      or new.review_document_hash is distinct from old.review_document_hash then
      raise exception 'published rulesets are immutable except deactivation metadata';
    end if;
  end if;
  return new;
end;
$$;

