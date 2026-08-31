-- Phase 11 PR #10: public discovery fields over the existing strict approved set.
-- This function deliberately starts from list_approved_public_products so discovery
-- can never broaden the eligibility rules used by the canonical approved projection.

-- The launch catalog target exceeds the original 100-row safety cap. Keep the same
-- eligibility function and bounded behavior while allowing discovery to page across
-- the first 500 qualified records. Public application requests remain capped at 100.
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

  safe_limit := least(greatest(coalesce(result_limit, 48), 1), 500);
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
  from public.products product
  join lateral public.public_product_card(product.id) card on true
  where product.active = true
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

create or replace function public.list_approved_discovery_products(
  filter_category text default null,
  filter_brand text default null,
  filter_verification public.verification_status default null,
  filter_individually_packaged boolean default null,
  result_limit integer default 100,
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
  ruleset_hash text,
  individually_packaged boolean,
  evidence_title text,
  evidence_url text,
  evidence_observed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with approved as (
    select card.*
    from public.list_approved_public_products(
      filter_category,
      filter_brand,
      500,
      0
    ) card
  )
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
    card.ruleset_hash,
    product.individually_packaged,
    case
      when source.source_type = 'PACKAGE_PHOTO' then 'Reviewed package photograph'
      when source.source_type = 'MANUFACTURER' then source.source_reference
      else null
    end as evidence_title,
    case
      when source.source_type = 'MANUFACTURER'
        and source.source_url ~ '^https://'
        then source.source_url
      else null
    end as evidence_url,
    source.observed_at as evidence_observed_at
  from approved card
  join public.products product on product.id = card.id
  left join lateral (
    select formulation.id, formulation.verification_status
    from public.formulations formulation
    where formulation.id = public.latest_public_formulation_id(card.id)
  ) formulation on true
  left join lateral (
    select
      formulation_source.source_type,
      formulation_source.source_reference,
      formulation_source.source_url,
      formulation_source.observed_at
    from public.formulation_sources formulation_source
    where formulation_source.formulation_id = formulation.id
      and formulation_source.source_type in ('MANUFACTURER', 'PACKAGE_PHOTO')
    order by
      case
        when formulation.verification_status = 'PACKAGE_VERIFIED'
          and formulation_source.source_type = 'PACKAGE_PHOTO' then 0
        when formulation.verification_status = 'VERIFIED'
          and formulation_source.source_type = 'MANUFACTURER' then 0
        else 1
      end,
      formulation_source.observed_at desc,
      formulation_source.id desc
    limit 1
  ) source on true
  where
    (filter_verification is null or card.verification_status = filter_verification)
    and (
      filter_individually_packaged is null
      or product.individually_packaged = filter_individually_packaged
    )
  order by
    card.category asc nulls last,
    card.brand asc,
    card.name asc,
    card.id asc
  limit least(greatest(coalesce(result_limit, 100), 1), 500)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

revoke all on function public.list_approved_discovery_products(
  text, text, public.verification_status, boolean, integer, integer
) from public, anon;

grant execute on function public.list_approved_discovery_products(
  text, text, public.verification_status, boolean, integer, integer
) to anon, authenticated, service_role;
