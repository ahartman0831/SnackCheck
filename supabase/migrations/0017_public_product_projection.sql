-- Phase 2: anonymous-safe product projection, escaped search, approved query.

create or replace function public.escape_like_pattern(input text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(coalesce(input, ''), '\', '\\'), '%', '\%'), '_', '\_');
$$;

create or replace function public.current_published_arizona_ruleset()
returns table (
  id uuid,
  ruleset_hash text,
  freshness_current_days integer,
  freshness_aging_days integer
)
language sql
stable
as $$
  select r.id, r.ruleset_hash, r.freshness_current_days, r.freshness_aging_days
  from public.rulesets r
  where r.code = 'AZ-HSA'
    and r.is_published = true
    and coalesce(r.ruleset_hash, '') <> ''
  order by r.version desc
  limit 1;
$$;

create or replace function public.latest_public_formulation_id(target_product_id uuid)
returns uuid
language sql
stable
as $$
  select f.id
  from public.formulations f
  where f.product_id = target_product_id
    and f.active = true
  order by
    f.last_verified_at desc nulls last,
    f.last_observed_at desc,
    f.version desc,
    f.id desc
  limit 1;
$$;

create or replace function public.formulation_freshness_state(
  last_verified_at timestamptz,
  current_days integer,
  aging_days integer
)
returns text
language sql
immutable
as $$
  select case
    when last_verified_at is null then 'STALE'
    when (current_date - last_verified_at::date) > aging_days then 'STALE'
    when (current_date - last_verified_at::date) > current_days then 'AGING'
    else 'CURRENT'
  end;
$$;

create or replace function public.public_product_card(target_product_id uuid)
returns table (
  id uuid,
  slug text,
  brand text,
  name text,
  variant text,
  size text,
  category text,
  image_url text,
  image_attribution text,
  ingredient_status public.ingredient_status,
  verification_status public.verification_status,
  last_verified_at timestamptz,
  freshness_state text,
  formulation_conflict boolean,
  ruleset_hash text
)
language sql
stable
security definer
set search_path = public
as $$
  with published as (
    select * from public.current_published_arizona_ruleset()
  ),
  latest as (
    select f.*
    from public.formulations f
    where f.id = public.latest_public_formulation_id(target_product_id)
  ),
  latest_eval as (
    select e.ingredient_status, e.ruleset_hash
    from public.compliance_evaluations e
    join latest f on f.id = e.formulation_id
    join published p on p.ruleset_hash = e.ruleset_hash
    where e.context = 'CLASSROOM_DISTRIBUTION'
    order by e.evaluation_date desc, e.created_at desc
    limit 1
  )
  select
    p.id,
    p.slug,
    p.brand,
    p.name,
    p.variant,
    p.size,
    p.category,
    p.image_url,
    p.image_attribution,
    coalesce(le.ingredient_status, 'VERIFY'::public.ingredient_status) as ingredient_status,
    f.verification_status,
    f.last_verified_at,
    public.formulation_freshness_state(
      f.last_verified_at,
      coalesce((select freshness_current_days from published), 180),
      coalesce((select freshness_aging_days from published), 365)
    ) as freshness_state,
    p.formulation_conflict,
    coalesce(le.ruleset_hash, (select published.ruleset_hash from published)) as ruleset_hash
  from public.products p
  left join latest f on true
  left join latest_eval le on true
  where p.id = target_product_id
    and p.active = true;
$$;

create or replace function public.search_public_products(
  query text,
  result_limit integer default 24,
  result_offset integer default 0,
  cursor_rank integer default null,
  cursor_name text default null,
  cursor_id uuid default null
)
returns table (
  id uuid,
  slug text,
  brand text,
  name text,
  variant text,
  size text,
  category text,
  image_url text,
  image_attribution text,
  ingredient_status public.ingredient_status,
  verification_status public.verification_status,
  last_verified_at timestamptz,
  freshness_state text,
  formulation_conflict boolean,
  ruleset_hash text,
  rank integer,
  similarity real
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized text;
  escaped text;
  safe_limit integer;
  safe_offset integer;
begin
  normalized := lower(unaccent(btrim(coalesce(query, ''))));
  if char_length(normalized) < 2 or char_length(normalized) > 80 then
    return;
  end if;

  escaped := public.escape_like_pattern(normalized);
  safe_limit := least(greatest(coalesce(result_limit, 24), 1), 24);
  safe_offset := greatest(coalesce(result_offset, 0), 0);

  return query
  with ranked as (
    select
      card.*,
      case
        when exists (
          select 1
          from public.product_identifiers i
          where i.product_id = card.id
            and (
              i.raw_value = normalized
              or i.normalized_gtin14 = normalized
            )
        ) then 1
        when lower(unaccent(card.name)) = normalized then 2
        when lower(unaccent(card.brand || ' ' || card.name)) = normalized then 3
        when lower(unaccent(card.name)) like escaped || '%' escape '\'
          or lower(unaccent(card.brand)) like escaped || '%' escape '\' then 4
        when p.search_document % normalized then 5
        else 6
      end as search_rank,
      greatest(
        similarity(p.search_document, normalized),
        similarity(lower(unaccent(card.name)), normalized),
        similarity(lower(unaccent(card.brand)), normalized)
      )::real as search_similarity
    from public.products p
    join lateral public.public_product_card(p.id) card on true
    where p.active = true
      and (
        p.search_document like '%' || escaped || '%' escape '\'
        or p.search_document % normalized
        or exists (
          select 1
          from public.product_identifiers i
          where i.product_id = p.id
            and (
              i.raw_value = normalized
              or i.normalized_gtin14 = normalized
            )
        )
      )
  )
  select
    ranked.id,
    ranked.slug,
    ranked.brand,
    ranked.name,
    ranked.variant,
    ranked.size,
    ranked.category,
    ranked.image_url,
    ranked.image_attribution,
    ranked.ingredient_status,
    ranked.verification_status,
    ranked.last_verified_at,
    ranked.freshness_state,
    ranked.formulation_conflict,
    ranked.ruleset_hash,
    ranked.search_rank,
    ranked.search_similarity
  from ranked
  where
    cursor_id is null
    or (ranked.search_rank, ranked.name, ranked.id) >
      (cursor_rank, cursor_name, cursor_id)
  order by ranked.search_rank asc, ranked.search_similarity desc, ranked.name asc, ranked.id asc
  limit safe_limit
  offset case when cursor_id is null then safe_offset else 0 end;
end;
$$;

create or replace function public.list_approved_public_products(
  filter_category text default null,
  filter_brand text default null,
  result_limit integer default 48,
  result_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  brand text,
  name text,
  variant text,
  size text,
  category text,
  image_url text,
  image_attribution text,
  ingredient_status public.ingredient_status,
  verification_status public.verification_status,
  last_verified_at timestamptz,
  freshness_state text,
  formulation_conflict boolean,
  ruleset_hash text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  published_hash text;
  safe_limit integer;
  safe_offset integer;
begin
  select r.ruleset_hash into published_hash
  from public.current_published_arizona_ruleset() r;

  if published_hash is null then
    return;
  end if;

  safe_limit := least(greatest(coalesce(result_limit, 48), 1), 100);
  safe_offset := greatest(coalesce(result_offset, 0), 0);

  return query
  select
    card.id,
    card.slug,
    card.brand,
    card.name,
    card.variant,
    card.size,
    card.category,
    card.image_url,
    card.image_attribution,
    card.ingredient_status,
    card.verification_status,
    card.last_verified_at,
    card.freshness_state,
    card.formulation_conflict,
    card.ruleset_hash
  from public.products p
  join lateral public.public_product_card(p.id) card on true
  where p.active = true
    and card.ingredient_status = 'PASS'
    and card.formulation_conflict = false
    and card.freshness_state = 'CURRENT'
    and card.ruleset_hash = published_hash
    and card.verification_status in ('VERIFIED', 'PACKAGE_VERIFIED')
    and (filter_category is null or card.category = filter_category)
    and (filter_brand is null or card.brand = filter_brand)
  order by card.brand asc, card.name asc, card.id asc
  limit safe_limit
  offset safe_offset;
end;
$$;

create or replace function public.list_public_sitemap_entries()
returns table (
  kind text,
  path text
)
language sql
stable
security definer
set search_path = public
as $$
  select 'product'::text as kind, '/product/' || card.slug as path
  from public.products p
  join lateral public.public_product_card(p.id) card on true
  where p.active = true
  union
  select distinct 'category'::text, '/approved/' || card.category
  from public.list_approved_public_products(null, null, 100, 0) card
  where card.category is not null
    and card.category <> ''
  order by 1, 2;
$$;

create or replace function public.import_catalog_row(
  p_gtin14 text,
  p_primary_upc text,
  p_identifier_type text,
  p_brand text,
  p_name text,
  p_variant text,
  p_size text,
  p_category text,
  p_slug text,
  p_raw_ingredients text,
  p_normalized_ingredient_text text,
  p_ingredient_text_sha256 text,
  p_source_type public.source_type,
  p_source_url text,
  p_source_title text,
  p_observed_at timestamptz,
  p_verification_status public.verification_status,
  p_notes text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
  v_formulation_id uuid;
  v_next_version integer;
  v_verified boolean;
begin
  if coalesce(p_gtin14, '') = ''
     or coalesce(p_brand, '') = ''
     or coalesce(p_name, '') = ''
     or coalesce(p_raw_ingredients, '') = ''
     or coalesce(p_source_url, '') = ''
     or p_observed_at is null then
    raise exception 'required import fields missing';
  end if;

  if p_observed_at > now() then
    raise exception 'observed_at cannot be in the future';
  end if;

  if p_identifier_type not in ('UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'GTIN_14') then
    raise exception 'identifier_type is not a known GTIN format';
  end if;

  select id into v_product_id
  from public.products
  where gtin14 = p_gtin14;

  if v_product_id is null then
    insert into public.products (
      gtin14, primary_upc, brand, name, variant, size, category, slug, active
    ) values (
      p_gtin14, p_primary_upc, p_brand, p_name, p_variant, p_size, p_category, p_slug, true
    )
    returning id into v_product_id;

    insert into public.product_identifiers (
      product_id, identifier_type, raw_value, normalized_gtin14, is_primary
    ) values (
      v_product_id,
      p_identifier_type,
      coalesce(p_primary_upc, p_gtin14),
      p_gtin14,
      true
    );
  end if;

  select id into v_formulation_id
  from public.formulations
  where product_id = v_product_id
    and ingredient_text_sha256 = p_ingredient_text_sha256;

  if v_formulation_id is not null then
    if exists (
      select 1
      from public.formulation_sources s
      where s.formulation_id = v_formulation_id
        and s.source_url = p_source_url
    ) then
      return 'unchanged';
    end if;

    insert into public.formulation_sources (
      formulation_id, source_type, source_url, source_reference, observed_at, provenance_json
    ) values (
      v_formulation_id,
      p_source_type,
      p_source_url,
      p_source_title,
      p_observed_at,
      jsonb_build_object('importer', 'import-products')
    );
    return 'created';
  end if;

  select coalesce(max(version), 0) + 1
  into v_next_version
  from public.formulations
  where product_id = v_product_id;

  update public.formulations
  set active = false
  where product_id = v_product_id;

  v_verified := p_verification_status in ('VERIFIED', 'PACKAGE_VERIFIED');

  insert into public.formulations (
    product_id,
    version,
    raw_ingredients,
    normalized_ingredient_text,
    ingredient_text_sha256,
    verification_status,
    first_observed_at,
    last_observed_at,
    last_verified_at,
    active,
    packaging_notes
  ) values (
    v_product_id,
    v_next_version,
    p_raw_ingredients,
    p_normalized_ingredient_text,
    p_ingredient_text_sha256,
    p_verification_status,
    p_observed_at,
    p_observed_at,
    case when v_verified then p_observed_at else null end,
    true,
    p_notes
  )
  returning id into v_formulation_id;

  insert into public.formulation_sources (
    formulation_id, source_type, source_url, source_reference, observed_at, provenance_json
  ) values (
    v_formulation_id,
    p_source_type,
    p_source_url,
    p_source_title,
    p_observed_at,
    jsonb_build_object('importer', 'import-products')
  );

  return 'created';
end;
$$;

-- Trigram / identifier indexes already exist in 0013
-- (products_search_trgm_idx, products_brand_trgm_idx, products_name_trgm_idx,
-- product_identifiers_gtin_idx). These cover escaped LIKE and % similarity.

create index if not exists products_category_brand_active_idx
  on public.products (category, brand)
  where active = true;

create index if not exists products_active_slug_idx
  on public.products (slug)
  where active = true;

create index if not exists formulations_latest_public_idx
  on public.formulations (product_id, active, last_verified_at desc, last_observed_at desc, version desc);

create index if not exists evaluations_public_projection_idx
  on public.compliance_evaluations (formulation_id, context, ruleset_hash, evaluation_date desc, created_at desc);

revoke all on function public.escape_like_pattern(text) from public, anon;
revoke all on function public.current_published_arizona_ruleset() from public, anon;
revoke all on function public.latest_public_formulation_id(uuid) from public, anon;
revoke all on function public.formulation_freshness_state(timestamptz, integer, integer) from public, anon;
revoke all on function public.public_product_card(uuid) from public, anon;
revoke all on function public.search_public_products(text, integer, integer, integer, text, uuid) from public, anon;
revoke all on function public.list_approved_public_products(text, text, integer, integer) from public, anon;
revoke all on function public.list_public_sitemap_entries() from public, anon;
revoke all on function public.import_catalog_row(
  text, text, text, text, text, text, text, text, text, text, text, text,
  public.source_type, text, text, timestamptz, public.verification_status, text
) from public, anon, authenticated;

grant execute on function public.search_public_products(text, integer, integer, integer, text, uuid) to anon, authenticated;
grant execute on function public.list_approved_public_products(text, text, integer, integer) to anon, authenticated;
grant execute on function public.list_public_sitemap_entries() to anon, authenticated;
grant execute on function public.import_catalog_row(
  text, text, text, text, text, text, text, text, text, text, text, text,
  public.source_type, text, text, timestamptz, public.verification_status, text
) to service_role;
