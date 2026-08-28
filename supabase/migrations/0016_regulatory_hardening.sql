-- Phase 1: fail-closed regulatory hardening.
-- Do not publish the unsigned seed. Production publication requires
-- signed review fields and a canonical hash.

drop trigger if exists rulesets_immutability on public.rulesets;

update public.rulesets
set
  is_published = false,
  published_at = null
where id = '33333333-3333-3333-3333-333333333333'
  and is_published = true;

alter table public.rulesets
  add column if not exists reviewed_by uuid null references auth.users(id),
  add column if not exists reviewed_at timestamptz null,
  add column if not exists published_by uuid null references auth.users(id),
  add column if not exists review_document_url text null,
  add column if not exists review_document_hash text null;

create or replace function public.canonical_json(value jsonb)
returns text
language plpgsql
immutable
as $$
declare
  result text;
  key text;
  parts text[] := '{}';
begin
  if value is null then
    return 'null';
  end if;

  case jsonb_typeof(value)
    when 'null' then
      return 'null';
    when 'boolean' then
      return value::text;
    when 'number' then
      return value::text;
    when 'string' then
      return to_json(value #>> '{}')::text;
    when 'array' then
      select coalesce(
        '[' || string_agg(public.canonical_json(elem), ',' order by ordinality) || ']',
        '[]'
      )
        into result
      from jsonb_array_elements(value) with ordinality as t(elem, ordinality);
      return result;
    when 'object' then
      for key in
        select object_key
        from jsonb_object_keys(value) as object_key
        order by object_key
      loop
        parts := parts || (to_json(key)::text || ':' || public.canonical_json(value -> key));
      end loop;
      return '{' || array_to_string(parts, ',') || '}';
    else
      return value::text;
  end case;
end;
$$;

create or replace function public.ruleset_canonical_payload(target_ruleset_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'code', r.code,
    'contexts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'applicabilityStatus', c.applicability_status::text,
          'context', c.context,
          'regulatorySourceId', c.regulatory_source_id::text
        )
        order by c.context
      )
      from public.ruleset_contexts c
      where c.ruleset_id = r.id
        and c.enabled
    ), '[]'::jsonb),
    'effectiveFrom', r.effective_from::text,
    'effectiveUntil', coalesce(to_jsonb(r.effective_until::text), 'null'::jsonb),
    'freshnessAgingDays', r.freshness_aging_days,
    'freshnessCurrentDays', r.freshness_current_days,
    'id', r.id::text,
    'sourceIds', coalesce((
      select jsonb_agg(source_id order by source_id)
      from (
        select distinct s.regulatory_source_id::text as source_id
        from public.prohibited_substances s
        where s.ruleset_id = r.id
          and s.enabled
      ) sources
    ), '[]'::jsonb),
    'substances', coalesce((
      select jsonb_agg(substance_row order by statutory_ordinal)
      from (
        select
          s.statutory_ordinal,
          jsonb_build_object(
            'aliases', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', a.id::text,
                  'matchMode', a.match_mode::text,
                  'normalizedAlias', a.normalized_alias,
                  'pattern', 'null'::jsonb
                )
                order by a.normalized_alias
              )
              from public.rule_aliases a
              where a.prohibited_substance_id = s.id
                and a.enabled
            ), '[]'::jsonb),
            'canonicalNormalized', s.canonical_normalized,
            'id', s.id::text,
            'statutoryOrdinal', s.statutory_ordinal
          ) as substance_row
        from public.prohibited_substances s
        where s.ruleset_id = r.id
          and s.enabled
      ) substances
    ), '[]'::jsonb),
    'version', r.version
  )
  from public.rulesets r
  where r.id = target_ruleset_id;
$$;

create or replace function public.ruleset_canonical_hash(target_ruleset_id uuid)
returns text
language sql
stable
as $$
  select encode(
    digest(convert_to(public.canonical_json(public.ruleset_canonical_payload(target_ruleset_id)), 'utf8'), 'sha256'),
    'hex'
  );
$$;

update public.rulesets
set ruleset_hash = public.ruleset_canonical_hash(id)
where id = '33333333-3333-3333-3333-333333333333';

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
    blockers := blockers || 'effective_from is required';
  end if;

  select count(*) into source_count
  from public.regulatory_sources s
  where s.jurisdiction_id = ruleset.jurisdiction_id
    and s.active
    and s.source_type in ('STATUTE', 'AGENCY_GUIDANCE');
  if source_count < 1 then
    blockers := blockers || 'at least one active primary source is required';
  end if;

  select count(*) into substance_count
  from public.prohibited_substances
  where ruleset_id = target_ruleset_id
    and enabled;
  if substance_count <> 11 then
    blockers := blockers || 'exactly 11 enabled statutory substances are required';
  end if;

  select count(*) into missing_substance_provenance
  from public.prohibited_substances
  where ruleset_id = target_ruleset_id
    and enabled
    and (regulatory_source_id is null or coalesce(btrim(source_locator), '') = '');
  if missing_substance_provenance > 0 then
    blockers := blockers || 'every enabled substance must have source provenance';
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
    blockers := blockers || 'every enabled alias must be approved and sourced';
  end if;

  select count(*) into missing_context_provenance
  from public.ruleset_contexts
  where ruleset_id = target_ruleset_id
    and enabled
    and (regulatory_source_id is null or coalesce(btrim(source_locator), '') = '');
  if missing_context_provenance > 0 then
    blockers := blockers || 'every enabled context must have source provenance';
  end if;

  expected_hash := public.ruleset_canonical_hash(target_ruleset_id);
  if ruleset.ruleset_hash is null or ruleset.ruleset_hash <> expected_hash then
    blockers := blockers || 'canonical ruleset hash must be populated';
  end if;

  if ruleset.reviewed_by is null or ruleset.reviewed_at is null then
    blockers := blockers || 'signed reviewer and reviewed_at are required';
  end if;

  if coalesce(btrim(ruleset.review_document_url), '') = ''
    or coalesce(btrim(ruleset.review_document_hash), '') = '' then
    blockers := blockers || 'review document URL and hash are required';
  end if;

  if ruleset.published_by is null then
    blockers := blockers || 'publisher is required';
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
    blockers := blockers || 'effective_from is required';
  end if;

  select count(*) into source_count
  from public.regulatory_sources s
  where s.jurisdiction_id = new.jurisdiction_id
    and s.active
    and s.source_type in ('STATUTE', 'AGENCY_GUIDANCE');
  if source_count < 1 then
    blockers := blockers || 'at least one active primary source is required';
  end if;

  select count(*) into substance_count
  from public.prohibited_substances
  where ruleset_id = new.id
    and enabled;
  if substance_count <> 11 then
    blockers := blockers || 'exactly 11 enabled statutory substances are required';
  end if;

  select count(*) into missing_substance_provenance
  from public.prohibited_substances
  where ruleset_id = new.id
    and enabled
    and (regulatory_source_id is null or coalesce(btrim(source_locator), '') = '');
  if missing_substance_provenance > 0 then
    blockers := blockers || 'every enabled substance must have source provenance';
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
    blockers := blockers || 'every enabled alias must be approved and sourced';
  end if;

  select count(*) into missing_context_provenance
  from public.ruleset_contexts
  where ruleset_id = new.id
    and enabled
    and (regulatory_source_id is null or coalesce(btrim(source_locator), '') = '');
  if missing_context_provenance > 0 then
    blockers := blockers || 'every enabled context must have source provenance';
  end if;

  expected_hash := public.ruleset_canonical_hash(new.id);
  if new.ruleset_hash is null or new.ruleset_hash <> expected_hash then
    blockers := blockers || 'canonical ruleset hash must be populated';
  end if;

  if new.reviewed_by is null or new.reviewed_at is null then
    blockers := blockers || 'signed reviewer and reviewed_at are required';
  end if;

  if coalesce(btrim(new.review_document_url), '') = ''
    or coalesce(btrim(new.review_document_hash), '') = '' then
    blockers := blockers || 'review document URL and hash are required';
  end if;

  if new.published_by is null then
    blockers := blockers || 'publisher is required';
  end if;

  if coalesce(array_length(blockers, 1), 0) > 0 then
    raise exception 'ruleset publication requirements are not met';
  end if;

  return new;
end;
$$;

create trigger rulesets_publication_guard
  before insert or update of is_published, published_at, published_by, ruleset_hash,
    reviewed_by, reviewed_at, review_document_url, review_document_hash
  on public.rulesets
  for each row
  execute function public.enforce_ruleset_publication_requirements();

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
      or new.review_document_url is distinct from old.review_document_url
      or new.review_document_hash is distinct from old.review_document_hash then
      raise exception 'published rulesets are immutable except deactivation metadata';
    end if;
  end if;
  return new;
end;
$$;

create trigger rulesets_immutability
  before update on public.rulesets
  for each row
  execute function public.enforce_published_ruleset_immutability();

create or replace function public.enforce_published_ruleset_children_immutable()
returns trigger
language plpgsql
as $$
declare
  parent_id uuid;
  published boolean;
begin
  parent_id := coalesce(
    case
      when tg_table_name = 'rule_aliases' then (
        select s.ruleset_id
        from public.prohibited_substances s
        where s.id = coalesce(new.prohibited_substance_id, old.prohibited_substance_id)
      )
      else coalesce(new.ruleset_id, old.ruleset_id)
    end
  );

  select is_published into published
  from public.rulesets
  where id = parent_id;

  if coalesce(published, false) then
    raise exception 'published ruleset child rows are immutable';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists ruleset_contexts_published_immutable on public.ruleset_contexts;
create trigger ruleset_contexts_published_immutable
  before insert or update or delete on public.ruleset_contexts
  for each row
  execute function public.enforce_published_ruleset_children_immutable();

drop trigger if exists prohibited_substances_published_immutable on public.prohibited_substances;
create trigger prohibited_substances_published_immutable
  before insert or update or delete on public.prohibited_substances
  for each row
  execute function public.enforce_published_ruleset_children_immutable();

drop trigger if exists rule_aliases_published_immutable on public.rule_aliases;
create trigger rule_aliases_published_immutable
  before insert or update or delete on public.rule_aliases
  for each row
  execute function public.enforce_published_ruleset_children_immutable();

create or replace function public.clone_ruleset_to_draft(source_ruleset_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source public.rulesets%rowtype;
  draft_id uuid;
  next_version integer;
  substance_map jsonb := '{}'::jsonb;
  new_substance_id uuid;
  substance public.prohibited_substances%rowtype;
begin
  if auth.uid() is not null
    and not public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception 'not authorized to clone a ruleset';
  end if;

  select * into source from public.rulesets where id = source_ruleset_id;
  if not found then
    raise exception 'source ruleset does not exist';
  end if;

  select coalesce(max(version), source.version) + 1
    into next_version
  from public.rulesets
  where code = source.code;

  insert into public.rulesets (
    jurisdiction_id,
    code,
    version,
    title,
    effective_from,
    effective_until,
    published_at,
    is_published,
    ruleset_hash,
    freshness_current_days,
    freshness_aging_days,
    notes,
    created_by
  ) values (
    source.jurisdiction_id,
    source.code,
    next_version,
    source.title,
    source.effective_from,
    source.effective_until,
    null,
    false,
    null,
    source.freshness_current_days,
    source.freshness_aging_days,
    'Draft cloned from version ' || source.version::text,
    auth.uid()
  )
  returning id into draft_id;

  insert into public.ruleset_contexts (
    ruleset_id,
    context,
    applicability_status,
    regulatory_source_id,
    source_locator,
    public_summary,
    enabled
  )
  select
    draft_id,
    context,
    applicability_status,
    regulatory_source_id,
    source_locator,
    public_summary,
    enabled
  from public.ruleset_contexts
  where ruleset_id = source.id;

  for substance in
    select * from public.prohibited_substances where ruleset_id = source.id
  loop
    insert into public.prohibited_substances (
      ruleset_id,
      canonical_name,
      canonical_normalized,
      statutory_ordinal,
      regulatory_source_id,
      source_locator,
      enabled
    ) values (
      draft_id,
      substance.canonical_name,
      substance.canonical_normalized,
      substance.statutory_ordinal,
      substance.regulatory_source_id,
      substance.source_locator,
      substance.enabled
    )
    returning id into new_substance_id;
    substance_map := substance_map || jsonb_build_object(substance.id::text, new_substance_id::text);
  end loop;

  insert into public.rule_aliases (
    prohibited_substance_id,
    alias,
    normalized_alias,
    match_mode,
    review_status,
    enabled,
    regulatory_source_id,
    reviewed_by,
    reviewed_at,
    review_notes
  )
  select
    (substance_map ->> a.prohibited_substance_id::text)::uuid,
    a.alias,
    a.normalized_alias,
    a.match_mode,
    a.review_status,
    a.enabled,
    a.regulatory_source_id,
    a.reviewed_by,
    a.reviewed_at,
    a.review_notes
  from public.rule_aliases a
  join public.prohibited_substances s on s.id = a.prohibited_substance_id
  where s.ruleset_id = source.id;

  update public.rulesets
  set ruleset_hash = public.ruleset_canonical_hash(draft_id)
  where id = draft_id;

  return draft_id;
end;
$$;

create or replace function public.review_ruleset(
  target_ruleset_id uuid,
  reviewer_id uuid,
  document_url text,
  document_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and not public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception 'not authorized to review a ruleset';
  end if;

  if exists (select 1 from public.rulesets where id = target_ruleset_id and is_published) then
    raise exception 'published rulesets cannot be reviewed in place; clone a draft';
  end if;

  update public.rulesets
  set
    reviewed_by = reviewer_id,
    reviewed_at = now(),
    review_document_url = document_url,
    review_document_hash = document_hash,
    ruleset_hash = public.ruleset_canonical_hash(target_ruleset_id)
  where id = target_ruleset_id;

  if not found then
    raise exception 'ruleset does not exist';
  end if;
end;
$$;

create or replace function public.publish_ruleset(
  target_ruleset_id uuid,
  publisher_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and not public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception 'not authorized to publish a ruleset';
  end if;

  update public.rulesets
  set
    published_by = publisher_id,
    published_at = now(),
    is_published = true,
    ruleset_hash = public.ruleset_canonical_hash(target_ruleset_id)
  where id = target_ruleset_id
    and is_published = false;

  if not found then
    raise exception 'ruleset does not exist or is already published';
  end if;
end;
$$;

revoke all on function public.canonical_json(jsonb) from public, anon;
revoke all on function public.ruleset_canonical_payload(uuid) from public, anon;
revoke all on function public.ruleset_canonical_hash(uuid) from public, anon;
revoke all on function public.ruleset_publication_blockers(uuid) from public, anon;
revoke all on function public.clone_ruleset_to_draft(uuid) from public, anon;
revoke all on function public.review_ruleset(uuid, uuid, text, text) from public, anon;
revoke all on function public.publish_ruleset(uuid, uuid) from public, anon;

grant execute on function public.ruleset_canonical_hash(uuid) to authenticated;
grant execute on function public.ruleset_publication_blockers(uuid) to authenticated;
grant execute on function public.clone_ruleset_to_draft(uuid) to authenticated;
grant execute on function public.review_ruleset(uuid, uuid, text, text) to authenticated;
grant execute on function public.publish_ruleset(uuid, uuid) to authenticated;
