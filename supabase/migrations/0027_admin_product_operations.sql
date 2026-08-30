create or replace function public.admin_create_product_from_submission(
  p_submission_id uuid,
  p_expected_submission_updated_at timestamptz,
  p_brand text,
  p_name text,
  p_variant text,
  p_size text,
  p_category text,
  p_slug text,
  p_individually_packaged boolean,
  p_identifier_type text,
  p_raw_identifier text,
  p_normalized_ingredient_text text,
  p_ingredients jsonb,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  submission_row public.submissions%rowtype;
  product_id_value uuid;
  formulation_id_value uuid;
  evaluation_id_value uuid;
  ruleset_row record;
  after_summary jsonb;
begin
  if actor_id is null
    or not public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active reviewer access is required';
  end if;
  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;
  if length(pg_catalog.btrim(coalesce(p_brand, ''))) not between 1 and 160
    or length(pg_catalog.btrim(coalesce(p_name, ''))) not between 1 and 200
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or length(p_slug) > 96
    or p_identifier_type not in ('UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'GTIN_14')
    or length(pg_catalog.btrim(coalesce(p_raw_identifier, ''))) = 0
    or length(pg_catalog.btrim(coalesce(p_normalized_ingredient_text, ''))) = 0
    or pg_catalog.jsonb_typeof(p_ingredients) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'valid product and formulation fields are required';
  end if;

  select * into submission_row
  from public.submissions
  where id = p_submission_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'submission does not exist';
  end if;
  if submission_row.updated_at is distinct from p_expected_submission_updated_at then
    raise exception using errcode = '40001', message = 'submission changed; refresh before creating a product';
  end if;
  if submission_row.status::text <> 'APPROVED'
    or submission_row.product_id is not null
    or submission_row.evidence_asset_id is null
    or submission_row.corrected_text is null
    or submission_row.confirmed_formulation_hash !~ '^[0-9a-f]{64}$'
    or submission_row.normalized_gtin14 !~ '^[0-9]{14}$' then
    raise exception using errcode = '23514', message = 'only approved unlinked package evidence can create a product';
  end if;
  if exists (
    select 1 from public.product_identifiers
    where normalized_gtin14 = submission_row.normalized_gtin14
  ) or exists (
    select 1 from public.products where gtin14 = submission_row.normalized_gtin14
  ) then
    raise exception using errcode = '23505', message = 'that barcode already belongs to a product';
  end if;

  insert into public.products (
    gtin14, primary_upc, brand, name, variant, size, category, slug,
    individually_packaged, active
  ) values (
    submission_row.normalized_gtin14,
    pg_catalog.btrim(p_raw_identifier),
    pg_catalog.btrim(p_brand),
    pg_catalog.btrim(p_name),
    nullif(pg_catalog.btrim(p_variant), ''),
    nullif(pg_catalog.btrim(p_size), ''),
    nullif(pg_catalog.btrim(p_category), ''),
    p_slug,
    p_individually_packaged,
    true
  ) returning id into product_id_value;

  insert into public.product_identifiers (
    product_id, identifier_type, raw_value, normalized_gtin14, is_primary
  ) values (
    product_id_value, p_identifier_type, pg_catalog.btrim(p_raw_identifier),
    submission_row.normalized_gtin14, true
  );

  insert into public.formulations (
    product_id, version, raw_ingredients, normalized_ingredient_text,
    ingredient_text_sha256, verification_status, confidence,
    first_observed_at, last_observed_at, last_verified_at, active, created_by
  ) values (
    product_id_value, 1, submission_row.corrected_text,
    p_normalized_ingredient_text, submission_row.confirmed_formulation_hash,
    'PACKAGE_VERIFIED', submission_row.extraction_confidence,
    coalesce(submission_row.confirmed_at, pg_catalog.now()), pg_catalog.now(),
    pg_catalog.now(), true, actor_id
  ) returning id into formulation_id_value;

  insert into public.formulation_sources (
    formulation_id, source_type, source_reference, evidence_asset_id,
    observed_at, submitted_by, provenance_json
  ) values (
    formulation_id_value, 'PACKAGE_PHOTO', 'submission:' || p_submission_id::text,
    submission_row.evidence_asset_id, pg_catalog.now(), actor_id,
    pg_catalog.jsonb_build_object(
      'submissionId', p_submission_id,
      'humanConfirmed', true,
      'adminPackageReviewed', true
    )
  );

  insert into public.formulation_ingredients (
    formulation_id, ordinal, raw_label_value, normalized_value,
    parent_ordinal, presence_kind, parser_confidence
  )
  select formulation_id_value, ingredient.ordinal, ingredient.raw,
    ingredient.normalized, ingredient."parentOrdinal",
    case when ingredient."presenceKind" in ('DECLARED', 'PRECAUTIONARY', 'UNKNOWN')
      then ingredient."presenceKind" else 'UNKNOWN' end,
    submission_row.extraction_confidence
  from pg_catalog.jsonb_to_recordset(p_ingredients) as ingredient(
    ordinal integer, raw text, normalized text,
    "parentOrdinal" integer, "presenceKind" text
  )
  where ingredient.ordinal >= 0
    and coalesce(ingredient.raw, '') <> ''
    and coalesce(ingredient.normalized, '') <> '';

  if pg_catalog.jsonb_typeof(submission_row.evaluation_result_json) = 'object' then
    select id, jurisdiction_id, ruleset_hash into ruleset_row
    from public.rulesets
    where is_published = true
      and ruleset_hash = submission_row.evaluation_result_json ->> 'rulesetHash'
    order by published_at desc nulls last
    limit 1;
    if found
      and submission_row.evaluation_result_json ->> 'formulationHash' = submission_row.confirmed_formulation_hash
      and submission_row.evaluation_result_json ->> 'ingredientStatus' in ('PASS', 'FAIL', 'VERIFY')
      and submission_row.evaluation_result_json ->> 'applicabilityStatus' in ('APPLIES','PARENT_OWN_CHILD_EXCEPTION','OUTSIDE_NORMAL_SCHOOL_DAY','SCHOOL_NOT_CONFIRMED_PARTICIPATING','UNKNOWN')
      and submission_row.evaluation_result_json ->> 'localPolicyStatus' in ('ALLOWED_BY_VERIFIED_POLICY','RESTRICTED_BY_VERIFIED_POLICY','NO_VERIFIED_POLICY','NOT_REQUESTED') then
      insert into public.compliance_evaluations (
        formulation_id, ruleset_id, jurisdiction_id, context, evaluation_date,
        ingredient_status, applicability_status, local_policy_status,
        ruleset_hash, formulation_hash, quality_flags, engine_version, explanation_json
      ) values (
        formulation_id_value, ruleset_row.id, ruleset_row.jurisdiction_id,
        'CLASSROOM_DISTRIBUTION',
        ((submission_row.evaluation_result_json ->> 'evaluatedAt')::timestamptz at time zone 'utc')::date,
        (submission_row.evaluation_result_json ->> 'ingredientStatus')::public.ingredient_status,
        (submission_row.evaluation_result_json ->> 'applicabilityStatus')::public.applicability_status,
        (submission_row.evaluation_result_json ->> 'localPolicyStatus')::public.local_policy_status,
        ruleset_row.ruleset_hash, submission_row.confirmed_formulation_hash,
        coalesce(submission_row.evaluation_result_json -> 'qualityFlags', '[]'::jsonb),
        submission_row.evaluation_result_json ->> 'engineVersion',
        coalesce(submission_row.evaluation_result_json -> 'explanation', '{}'::jsonb)
      ) returning id into evaluation_id_value;

      if evaluation_id_value is not null
        and pg_catalog.jsonb_typeof(submission_row.evaluation_result_json -> 'matchedRules') = 'array' then
        insert into public.evaluation_matches (
          evaluation_id, prohibited_substance_id, rule_alias_id,
          formulation_ingredient_id, raw_label_value, normalized_label_value,
          matched_alias, match_mode
        )
        select evaluation_id_value, substance.id, alias.id,
          formulation_ingredient.id, match."rawLabelValue",
          match."normalizedLabelValue", match.alias,
          match."matchMode"::public.match_mode
        from pg_catalog.jsonb_to_recordset(
          submission_row.evaluation_result_json -> 'matchedRules'
        ) as match(
          "substanceId" uuid, "aliasId" uuid,
          "formulationIngredientOrdinal" integer, "rawLabelValue" text,
          "normalizedLabelValue" text, alias text, "matchMode" text
        )
        join public.prohibited_substances substance
          on substance.id = match."substanceId" and substance.ruleset_id = ruleset_row.id
        join public.rule_aliases alias
          on alias.id = match."aliasId" and alias.prohibited_substance_id = substance.id
        left join public.formulation_ingredients formulation_ingredient
          on formulation_ingredient.formulation_id = formulation_id_value
          and formulation_ingredient.ordinal = match."formulationIngredientOrdinal"
        where match."matchMode" in ('EXACT_SEGMENT', 'TOKEN_SEQUENCE', 'REVIEWED_REGEX');
      end if;
    end if;
  end if;

  update public.submissions set product_id = product_id_value where id = p_submission_id;

  after_summary := pg_catalog.jsonb_build_object(
    'product_id', product_id_value,
    'submission_id', p_submission_id,
    'formulation_id', formulation_id_value,
    'slug', p_slug,
    'gtin14', submission_row.normalized_gtin14,
    'verification_status', 'PACKAGE_VERIFIED'
  );
  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id, 'PRODUCT_CREATED_FROM_SUBMISSION', 'product', product_id_value,
    pg_catalog.jsonb_build_object('submission_id', p_submission_id),
    after_summary, p_request_id
  );
  return after_summary;
end;
$$;

create or replace function public.admin_merge_products(
  p_source_product_id uuid,
  p_target_product_id uuid,
  p_expected_source_updated_at timestamptz,
  p_expected_target_updated_at timestamptz,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  source_row public.products%rowtype;
  target_row public.products%rowtype;
  target_max_version integer;
  target_has_active_formulation boolean;
  moved_formulations integer;
  after_summary jsonb;
begin
  if actor_id is null
    or not public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active reviewer access is required';
  end if;
  if p_source_product_id = p_target_product_id then
    raise exception using errcode = '22023', message = 'source and target products must differ';
  end if;
  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(p_source_product_id, p_target_product_id)::text, 27)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(greatest(p_source_product_id, p_target_product_id)::text, 27)
  );
  select * into source_row from public.products where id = p_source_product_id for update;
  select * into target_row from public.products where id = p_target_product_id for update;
  if source_row.id is null or target_row.id is null then
    raise exception using errcode = 'P0002', message = 'both products must exist';
  end if;
  if source_row.updated_at is distinct from p_expected_source_updated_at
    or target_row.updated_at is distinct from p_expected_target_updated_at then
    raise exception using errcode = '40001', message = 'a product changed; refresh before merging';
  end if;
  if not source_row.active or not target_row.active then
    raise exception using errcode = '23514', message = 'both products must be active before merging';
  end if;
  if exists (
    select 1 from public.data_conflicts
    where product_id in (p_source_product_id, p_target_product_id)
      and status = 'OPEN' and resolved_at is null
  ) then
    raise exception using errcode = '23514', message = 'resolve open formulation conflicts before merging';
  end if;
  if exists (
    select 1 from public.formulations source_formulation
    join public.formulations target_formulation
      on target_formulation.product_id = p_target_product_id
      and target_formulation.ingredient_text_sha256 = source_formulation.ingredient_text_sha256
    where source_formulation.product_id = p_source_product_id
  ) then
    raise exception using errcode = '23514', message = 'duplicate formulation evidence must be resolved before merging';
  end if;

  insert into public.product_aliases (product_id, alias, normalized_alias)
  select p_target_product_id, alias_value,
    pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(alias_value), '\s+', ' ', 'g'))
  from (values (
    pg_catalog.concat_ws(' ', source_row.brand, source_row.name, source_row.variant)
  )) aliases(alias_value)
  where pg_catalog.btrim(alias_value) <> ''
  on conflict (product_id, normalized_alias) do nothing;

  insert into public.product_aliases (product_id, alias, normalized_alias)
  select p_target_product_id, alias, normalized_alias
  from public.product_aliases where product_id = p_source_product_id
  on conflict (product_id, normalized_alias) do nothing;
  delete from public.product_aliases where product_id = p_source_product_id;

  delete from public.product_identifiers source_identifier
  where source_identifier.product_id = p_source_product_id
    and exists (
      select 1 from public.product_identifiers target_identifier
      where target_identifier.product_id = p_target_product_id
        and target_identifier.normalized_gtin14 = source_identifier.normalized_gtin14
    );
  update public.product_identifiers
  set product_id = p_target_product_id, is_primary = false
  where product_id = p_source_product_id;

  select coalesce(pg_catalog.max(version), 0) into target_max_version
  from public.formulations where product_id = p_target_product_id;
  select exists (
    select 1 from public.formulations
    where product_id = p_target_product_id and active = true
  ) into target_has_active_formulation;
  if target_has_active_formulation then
    update public.formulations set active = false
    where product_id = p_source_product_id and active = true;
  end if;
  with numbered as (
    select id, pg_catalog.row_number() over (order by version, created_at, id) as ordinal
    from public.formulations where product_id = p_source_product_id
  )
  update public.formulations formulation
  set version = -numbered.ordinal
  from numbered where formulation.id = numbered.id;
  with numbered as (
    select id, pg_catalog.row_number() over (order by version desc, created_at, id) as ordinal
    from public.formulations where product_id = p_source_product_id
  )
  update public.formulations formulation
  set product_id = p_target_product_id,
      version = target_max_version + numbered.ordinal
  from numbered where formulation.id = numbered.id;
  get diagnostics moved_formulations = row_count;

  update public.submissions set product_id = p_target_product_id
  where product_id = p_source_product_id;
  update public.data_conflicts set product_id = p_target_product_id
  where product_id = p_source_product_id;
  update public.product_redirects set to_product_id = p_target_product_id
  where to_product_id = p_source_product_id;
  insert into public.product_redirects (from_slug, to_product_id)
  values (source_row.slug, p_target_product_id)
  on conflict (from_slug) do update set to_product_id = excluded.to_product_id;

  update public.products
  set active = false, gtin14 = null, primary_upc = null
  where id = p_source_product_id;

  update public.products
  set gtin14 = coalesce(gtin14, source_row.gtin14),
      primary_upc = coalesce(primary_upc, source_row.primary_upc),
      image_url = coalesce(image_url, source_row.image_url),
      image_attribution = coalesce(image_attribution, source_row.image_attribution),
      individually_packaged = coalesce(individually_packaged, source_row.individually_packaged),
      formulation_conflict = false
  where id = p_target_product_id;

  after_summary := pg_catalog.jsonb_build_object(
    'source_product_id', p_source_product_id,
    'target_product_id', p_target_product_id,
    'redirect_from_slug', source_row.slug,
    'target_slug', target_row.slug,
    'moved_formulations', moved_formulations
  );
  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id, 'PRODUCT_MERGED', 'product', p_target_product_id,
    pg_catalog.jsonb_build_object(
      'source_product_id', p_source_product_id,
      'source_slug', source_row.slug,
      'target_product_id', p_target_product_id,
      'target_slug', target_row.slug
    ), after_summary, p_request_id
  );
  return after_summary;
end;
$$;

revoke all on function public.admin_create_product_from_submission(
  uuid, timestamptz, text, text, text, text, text, text, boolean,
  text, text, text, jsonb, text
) from public, anon;
grant execute on function public.admin_create_product_from_submission(
  uuid, timestamptz, text, text, text, text, text, text, boolean,
  text, text, text, jsonb, text
) to authenticated;

revoke all on function public.admin_merge_products(
  uuid, uuid, timestamptz, timestamptz, text
) from public, anon;
grant execute on function public.admin_merge_products(
  uuid, uuid, timestamptz, timestamptz, text
) to authenticated;
