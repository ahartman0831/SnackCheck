-- Forward fix for 0016 trigger/publication guards found by CI pgTAP.
-- text[] || text treats the right-hand side as an array literal.
-- A shared child-immutability function cannot reference table-specific NEW fields.

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

  if ruleset.reviewed_by is null or ruleset.reviewed_at is null then
    blockers := array_append(blockers, 'signed reviewer and reviewed_at are required');
  end if;

  if coalesce(btrim(ruleset.review_document_url), '') = ''
    or coalesce(btrim(ruleset.review_document_hash), '') = '' then
    blockers := array_append(blockers, 'review document URL and hash are required');
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

  if new.reviewed_by is null or new.reviewed_at is null then
    blockers := array_append(blockers, 'signed reviewer and reviewed_at are required');
  end if;

  if coalesce(btrim(new.review_document_url), '') = ''
    or coalesce(btrim(new.review_document_hash), '') = '' then
    blockers := array_append(blockers, 'review document URL and hash are required');
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

create or replace function public.enforce_published_ruleset_row_immutable()
returns trigger
language plpgsql
as $$
declare
  parent_id uuid;
  published boolean;
begin
  parent_id := coalesce(new.ruleset_id, old.ruleset_id);
  select is_published into published from public.rulesets where id = parent_id;
  if coalesce(published, false) then
    raise exception 'published ruleset child rows are immutable';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.enforce_published_alias_row_immutable()
returns trigger
language plpgsql
as $$
declare
  parent_id uuid;
  published boolean;
  substance_id uuid;
begin
  substance_id := coalesce(new.prohibited_substance_id, old.prohibited_substance_id);
  select s.ruleset_id into parent_id
  from public.prohibited_substances s
  where s.id = substance_id;
  select is_published into published from public.rulesets where id = parent_id;
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
  execute function public.enforce_published_ruleset_row_immutable();

drop trigger if exists prohibited_substances_published_immutable on public.prohibited_substances;
create trigger prohibited_substances_published_immutable
  before insert or update or delete on public.prohibited_substances
  for each row
  execute function public.enforce_published_ruleset_row_immutable();

drop trigger if exists rule_aliases_published_immutable on public.rule_aliases;
create trigger rule_aliases_published_immutable
  before insert or update or delete on public.rule_aliases
  for each row
  execute function public.enforce_published_alias_row_immutable();
