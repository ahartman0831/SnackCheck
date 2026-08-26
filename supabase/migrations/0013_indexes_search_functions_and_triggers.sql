create index products_search_trgm_idx
  on public.products using gin (search_document gin_trgm_ops);

create index products_brand_trgm_idx
  on public.products using gin (brand gin_trgm_ops);

create index products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);

create index formulations_product_active_idx
  on public.formulations (product_id, active, last_verified_at desc);

create index formulation_ingredients_normalized_idx
  on public.formulation_ingredients (normalized_value);

create index rulesets_effective_idx
  on public.rulesets (jurisdiction_id, effective_from, effective_until)
  where is_published = true;

create index aliases_enabled_idx
  on public.rule_aliases (prohibited_substance_id, normalized_alias)
  where enabled = true;

create index evaluations_lookup_idx
  on public.compliance_evaluations (formulation_id, ruleset_id, created_at desc);

create index submissions_review_queue_idx
  on public.submissions (status, created_at desc);

create index product_identifiers_gtin_idx
  on public.product_identifiers (normalized_gtin14);

create index analytics_events_name_date_idx
  on public.analytics_events (event_name, occurred_on desc);

create or replace function public.refresh_product_search_document(target_product_id uuid)
returns void
language plpgsql
as $$
declare
  aliases text;
  identifiers text;
begin
  select coalesce(string_agg(alias, ' '), '')
    into aliases
  from public.product_aliases
  where product_id = target_product_id;

  select coalesce(string_agg(raw_value || ' ' || normalized_gtin14, ' '), '')
    into identifiers
  from public.product_identifiers
  where product_id = target_product_id;

  update public.products
  set search_document = lower(unaccent(concat_ws(
    ' ',
    brand,
    name,
    coalesce(variant, ''),
    coalesce(category, ''),
    coalesce(primary_upc, ''),
    coalesce(gtin14, ''),
    aliases,
    identifiers
  )))
  where id = target_product_id;
end;
$$;

create or replace function public.products_search_document_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_product_search_document(new.id);
  return new;
end;
$$;

create or replace function public.product_alias_search_document_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_product_search_document(coalesce(new.product_id, old.product_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.product_identifier_search_document_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_product_search_document(coalesce(new.product_id, old.product_id));
  return coalesce(new, old);
end;
$$;

create trigger products_search_document
  after insert or update of brand, name, variant, category, primary_upc, gtin14
  on public.products
  for each row execute function public.products_search_document_trigger();

create trigger product_aliases_search_document
  after insert or update or delete on public.product_aliases
  for each row execute function public.product_alias_search_document_trigger();

create trigger product_identifiers_search_document
  after insert or update or delete on public.product_identifiers
  for each row execute function public.product_identifier_search_document_trigger();

create or replace function public.enforce_rule_alias_enablement()
returns trigger
language plpgsql
as $$
begin
  if new.enabled then
    if new.review_status not in ('EXACT_STATUTE_TERM', 'AUTHORITATIVE_SYNONYM', 'EXPERT_VERIFIED') then
      raise exception 'enabled aliases must have an approved review status';
    end if;
    if new.review_status in ('AUTHORITATIVE_SYNONYM', 'EXPERT_VERIFIED')
      and (new.reviewed_by is null or new.reviewed_at is null) then
      raise exception 'reviewed aliases require reviewer and review timestamp';
    end if;
  end if;
  return new;
end;
$$;

create trigger rule_aliases_enablement
  before insert or update on public.rule_aliases
  for each row execute function public.enforce_rule_alias_enablement();

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
      or new.is_published is distinct from old.is_published then
      raise exception 'published rulesets are immutable except deactivation metadata';
    end if;
  end if;
  return new;
end;
$$;

create trigger rulesets_immutability
  before update on public.rulesets
  for each row execute function public.enforce_published_ruleset_immutability();

create or replace function public.enforce_single_active_formulation()
returns trigger
language plpgsql
as $$
declare
  conflicted boolean;
  active_count integer;
begin
  if new.active then
    select formulation_conflict into conflicted
    from public.products
    where id = new.product_id;

    select count(*) into active_count
    from public.formulations
    where product_id = new.product_id
      and active = true
      and id is distinct from new.id;

    if active_count > 0 and coalesce(conflicted, false) = false then
      raise exception 'multiple active formulations require an explicit product conflict';
    end if;
  end if;
  return new;
end;
$$;

create trigger formulations_single_active
  before insert or update of active on public.formulations
  for each row execute function public.enforce_single_active_formulation();

create or replace function public.search_products(
  query text,
  result_limit integer default 24,
  result_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  brand text,
  name text,
  variant text,
  category text,
  image_url text,
  rank integer,
  similarity real
)
language sql
stable
as $$
  with normalized as (
    select lower(unaccent(btrim(query))) as q
  )
  select
    p.id,
    p.slug,
    p.brand,
    p.name,
    p.variant,
    p.category,
    p.image_url,
    case
      when exists (
        select 1 from public.product_identifiers i
        where i.product_id = p.id
          and (
            i.raw_value = (select q from normalized)
            or i.normalized_gtin14 = (select q from normalized)
          )
      ) then 1
      when lower(unaccent(p.name)) = (select q from normalized) then 2
      when lower(unaccent(p.brand || ' ' || p.name)) = (select q from normalized) then 3
      when lower(unaccent(p.name)) like (select q from normalized) || '%'
        or lower(unaccent(p.brand)) like (select q from normalized) || '%' then 4
      when p.search_document % (select q from normalized) then 5
      else 6
    end as rank,
    greatest(
      similarity(p.search_document, (select q from normalized)),
      similarity(lower(unaccent(p.name)), (select q from normalized)),
      similarity(lower(unaccent(p.brand)), (select q from normalized))
    ) as similarity
  from public.products p
  where p.active = true
    and length((select q from normalized)) >= 2
    and (
      p.search_document like '%' || (select q from normalized) || '%'
      or p.search_document % (select q from normalized)
      or exists (
        select 1 from public.product_identifiers i
        where i.product_id = p.id
          and (
            i.raw_value = (select q from normalized)
            or i.normalized_gtin14 = (select q from normalized)
          )
      )
    )
  order by rank asc, similarity desc, p.name asc
  limit least(coalesce(result_limit, 24), 24)
  offset greatest(coalesce(result_offset, 0), 0);
$$;
