alter table public.catalog_source_records
  add column review_reason text null,
  add column reviewed_by uuid null references auth.users(id),
  add column reviewed_at timestamptz null;

create or replace function public.admin_review_catalog_candidate(
  p_candidate_id uuid,
  p_expected_updated_at timestamptz,
  p_decision text,
  p_reason text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  candidate_row public.catalog_source_records%rowtype;
  next_state text;
  after_summary jsonb;
begin
  if actor_id is null
    or not public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active reviewer access is required';
  end if;
  if p_decision not in ('QUEUE', 'REJECT') then
    raise exception using errcode = '22023', message = 'unsupported candidate decision';
  end if;
  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;
  if p_decision = 'REJECT' and length(pg_catalog.btrim(coalesce(p_reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'a rejection reason is required';
  end if;

  select * into candidate_row
  from public.catalog_source_records
  where id = p_candidate_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'catalog candidate does not exist';
  end if;
  if candidate_row.updated_at is distinct from p_expected_updated_at
    or candidate_row.candidate_state in ('PROMOTED', 'REJECTED', 'SUPERSEDED') then
    raise exception using errcode = '40001', message = 'catalog candidate changed; refresh before deciding';
  end if;
  if (p_decision = 'QUEUE' and candidate_row.candidate_state not in (
      'IMPORTED', 'SCREENED_PASS', 'SCREENED_FAIL', 'SCREENED_VERIFY'
    )) or (p_decision = 'REJECT' and candidate_row.candidate_state not in (
      'IMPORTED', 'SCREENED_PASS', 'SCREENED_FAIL', 'SCREENED_VERIFY', 'REVIEW_QUEUED'
    )) then
    raise exception using errcode = '40001', message = 'catalog candidate changed; refresh before deciding';
  end if;

  next_state := case when p_decision = 'QUEUE' then 'REVIEW_QUEUED' else 'REJECTED' end;
  update public.catalog_source_records
  set candidate_state = next_state,
      review_reason = nullif(pg_catalog.btrim(p_reason), ''),
      reviewed_by = actor_id,
      reviewed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = candidate_row.id;

  after_summary := pg_catalog.jsonb_build_object(
    'candidate_id', candidate_row.id,
    'prior_state', candidate_row.candidate_state,
    'candidate_state', next_state,
    'reason_recorded', nullif(pg_catalog.btrim(p_reason), '') is not null
  );
  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id, 'CATALOG_CANDIDATE_' || next_state, 'catalog_candidate',
    candidate_row.id,
    pg_catalog.jsonb_build_object('candidate_state', candidate_row.candidate_state),
    after_summary, p_request_id
  );
  return after_summary;
end;
$$;

create or replace function public.admin_promote_catalog_candidate(
  p_candidate_id uuid,
  p_expected_updated_at timestamptz,
  p_promotion jsonb,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  candidate_row public.catalog_source_records%rowtype;
  product_id_value uuid;
  formulation_id_value uuid;
  active_formulation_id uuid;
  evaluation_id_value uuid;
  conflict_id_value uuid;
  next_version integer;
  observed_at_value timestamptz;
  evidence_url_value text;
  evaluation_result jsonb;
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
  if pg_catalog.jsonb_typeof(p_promotion) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'promotion must be an object';
  end if;

  evidence_url_value := p_promotion ->> 'evidenceUrl';
  observed_at_value := (p_promotion ->> 'observedAt')::timestamptz;
  evaluation_result := coalesce(p_promotion -> 'evaluationResult', '{}'::jsonb);
  if length(pg_catalog.btrim(coalesce(p_promotion ->> 'brand', ''))) not between 1 and 160
    or length(pg_catalog.btrim(coalesce(p_promotion ->> 'name', ''))) not between 1 and 200
    or (p_promotion ->> 'slug') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or length(p_promotion ->> 'slug') > 96
    or length(pg_catalog.btrim(coalesce(p_promotion ->> 'verifiedIngredientText', ''))) = 0
    or length(pg_catalog.btrim(coalesce(p_promotion ->> 'normalizedIngredientText', ''))) = 0
    or (p_promotion ->> 'formulationHash') !~ '^[0-9a-f]{64}$'
    or pg_catalog.jsonb_typeof(p_promotion -> 'ingredients') is distinct from 'array'
    or length(pg_catalog.btrim(coalesce(p_promotion ->> 'evidenceTitle', ''))) = 0
    or evidence_url_value !~ '^https://'
    or evidence_url_value ~* '^https://([^/]+\.)?(nal\.usda\.gov|openfoodfacts\.org)(/|$)'
    or observed_at_value > pg_catalog.now() then
    raise exception using errcode = '22023', message = 'verified manufacturer evidence and product fields are required';
  end if;

  select * into candidate_row
  from public.catalog_source_records
  where id = p_candidate_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'catalog candidate does not exist';
  end if;
  if candidate_row.updated_at is distinct from p_expected_updated_at
    or candidate_row.candidate_state <> 'REVIEW_QUEUED'
    or candidate_row.discontinued then
    raise exception using errcode = '40001', message = 'only a current queued candidate can be promoted';
  end if;

  select id into product_id_value
  from public.products
  where gtin14 = candidate_row.normalized_gtin14
  for update;

  if product_id_value is null then
    insert into public.products (
      gtin14, primary_upc, brand, name, variant, size, category, slug,
      individually_packaged, active
    ) values (
      candidate_row.normalized_gtin14, candidate_row.source_gtin,
      pg_catalog.btrim(p_promotion ->> 'brand'), pg_catalog.btrim(p_promotion ->> 'name'),
      nullif(pg_catalog.btrim(p_promotion ->> 'variant'), ''),
      nullif(pg_catalog.btrim(p_promotion ->> 'size'), ''),
      nullif(pg_catalog.btrim(p_promotion ->> 'category'), ''),
      p_promotion ->> 'slug', (p_promotion ->> 'individuallyPackaged')::boolean, true
    ) returning id into product_id_value;

    insert into public.product_identifiers (
      product_id, identifier_type, raw_value, normalized_gtin14, is_primary
    ) values (
      product_id_value, 'GTIN_14', candidate_row.source_gtin,
      candidate_row.normalized_gtin14, true
    );
  end if;

  select id into active_formulation_id
  from public.formulations
  where product_id = product_id_value and active = true
  order by version desc
  limit 1
  for update;

  select id into formulation_id_value
  from public.formulations
  where product_id = product_id_value
    and ingredient_text_sha256 = p_promotion ->> 'formulationHash'
  for update;

  if formulation_id_value is null then
    select coalesce(max(version), 0) + 1 into next_version
    from public.formulations where product_id = product_id_value;
    insert into public.formulations (
      product_id, version, raw_ingredients, normalized_ingredient_text,
      ingredient_text_sha256, verification_status, confidence,
      first_observed_at, last_observed_at, last_verified_at, active, created_by
    ) values (
      product_id_value, next_version, p_promotion ->> 'verifiedIngredientText',
      p_promotion ->> 'normalizedIngredientText', p_promotion ->> 'formulationHash',
      'VERIFIED', 1, observed_at_value, observed_at_value, observed_at_value,
      active_formulation_id is null, actor_id
    ) returning id into formulation_id_value;

    insert into public.formulation_ingredients (
      formulation_id, ordinal, raw_label_value, normalized_value,
      parent_ordinal, presence_kind, parser_confidence
    )
    select formulation_id_value, ingredient.ordinal, ingredient.raw,
      ingredient.normalized, ingredient."parentOrdinal",
      case when ingredient."presenceKind" in ('DECLARED', 'PRECAUTIONARY', 'UNKNOWN')
        then ingredient."presenceKind" else 'UNKNOWN' end,
      1
    from pg_catalog.jsonb_to_recordset(p_promotion -> 'ingredients') as ingredient(
      ordinal integer, raw text, normalized text,
      "parentOrdinal" integer, "presenceKind" text
    )
    where ingredient.ordinal >= 0
      and coalesce(ingredient.raw, '') <> ''
      and coalesce(ingredient.normalized, '') <> '';
  else
    update public.formulations
    set verification_status = 'VERIFIED', confidence = 1,
        last_observed_at = greatest(last_observed_at, observed_at_value),
        last_verified_at = observed_at_value,
        active = case when active_formulation_id is null then true else active end,
        updated_at = pg_catalog.now()
    where id = formulation_id_value;
  end if;

  if not exists (
    select 1 from public.formulation_sources
    where formulation_id = formulation_id_value and source_url = evidence_url_value
  ) then
    insert into public.formulation_sources (
      formulation_id, source_type, source_reference, source_url,
      observed_at, submitted_by, provenance_json
    ) values (
      formulation_id_value, 'MANUFACTURER', p_promotion ->> 'evidenceTitle',
      evidence_url_value, observed_at_value, actor_id,
      pg_catalog.jsonb_build_object(
        'catalogCandidateId', candidate_row.id,
        'candidateProvider', candidate_row.provider,
        'reviewerConfirmed', true
      )
    );
  end if;

  if active_formulation_id is not null and active_formulation_id <> formulation_id_value then
    select id into conflict_id_value
    from public.data_conflicts
    where product_id = product_id_value and status = 'OPEN'
      and ((left_formulation_id = active_formulation_id and right_formulation_id = formulation_id_value)
        or (left_formulation_id = formulation_id_value and right_formulation_id = active_formulation_id))
    limit 1;
    if conflict_id_value is null then
      insert into public.data_conflicts (
        product_id, left_formulation_id, right_formulation_id, notes
      ) values (
        product_id_value, active_formulation_id, formulation_id_value,
        'Manufacturer-verified catalog candidate differs from the active formulation.'
      ) returning id into conflict_id_value;
    end if;
    update public.products set formulation_conflict = true where id = product_id_value;
  end if;

  if pg_catalog.jsonb_typeof(evaluation_result) = 'object' then
    select id, jurisdiction_id, ruleset_hash into ruleset_row
    from public.rulesets
    where is_published = true and ruleset_hash = evaluation_result ->> 'rulesetHash'
    order by published_at desc nulls last limit 1;
    if found
      and evaluation_result ->> 'formulationHash' = p_promotion ->> 'formulationHash'
      and evaluation_result ->> 'ingredientStatus' in ('PASS', 'FAIL', 'VERIFY')
      and evaluation_result ->> 'applicabilityStatus' in ('APPLIES','PARENT_OWN_CHILD_EXCEPTION','OUTSIDE_NORMAL_SCHOOL_DAY','SCHOOL_NOT_CONFIRMED_PARTICIPATING','UNKNOWN')
      and evaluation_result ->> 'localPolicyStatus' in ('ALLOWED_BY_VERIFIED_POLICY','RESTRICTED_BY_VERIFIED_POLICY','NO_VERIFIED_POLICY','NOT_REQUESTED') then
      insert into public.compliance_evaluations (
        formulation_id, ruleset_id, jurisdiction_id, context, evaluation_date,
        ingredient_status, applicability_status, local_policy_status,
        ruleset_hash, formulation_hash, quality_flags, engine_version, explanation_json
      ) values (
        formulation_id_value, ruleset_row.id, ruleset_row.jurisdiction_id,
        'CLASSROOM_DISTRIBUTION',
        ((evaluation_result ->> 'evaluatedAt')::timestamptz at time zone 'utc')::date,
        (evaluation_result ->> 'ingredientStatus')::public.ingredient_status,
        (evaluation_result ->> 'applicabilityStatus')::public.applicability_status,
        (evaluation_result ->> 'localPolicyStatus')::public.local_policy_status,
        ruleset_row.ruleset_hash, p_promotion ->> 'formulationHash',
        coalesce(evaluation_result -> 'qualityFlags', '[]'::jsonb),
        evaluation_result ->> 'engineVersion',
        coalesce(evaluation_result -> 'explanation', '{}'::jsonb)
      on conflict (
        formulation_id, ruleset_id, context, evaluation_date, ruleset_hash, formulation_hash
      ) do nothing
      returning id into evaluation_id_value;

      if evaluation_id_value is not null
        and pg_catalog.jsonb_typeof(evaluation_result -> 'matchedRules') = 'array' then
        insert into public.evaluation_matches (
          evaluation_id, prohibited_substance_id, rule_alias_id,
          formulation_ingredient_id, raw_label_value, normalized_label_value,
          matched_alias, match_mode
        )
        select evaluation_id_value, substance.id, alias.id,
          formulation_ingredient.id, match."rawLabelValue",
          match."normalizedLabelValue", match.alias,
          match."matchMode"::public.match_mode
        from pg_catalog.jsonb_to_recordset(evaluation_result -> 'matchedRules') as match(
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

  update public.catalog_source_records
  set candidate_state = 'PROMOTED', canonical_product_id = product_id_value,
      canonical_formulation_id = formulation_id_value, reviewed_by = actor_id,
      reviewed_at = pg_catalog.now(), updated_at = pg_catalog.now()
  where id = candidate_row.id;

  after_summary := pg_catalog.jsonb_build_object(
    'candidate_id', candidate_row.id, 'candidate_state', 'PROMOTED',
    'product_id', product_id_value, 'formulation_id', formulation_id_value,
    'verification_status', 'VERIFIED', 'source_type', 'MANUFACTURER',
    'conflict_id', conflict_id_value
  );
  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id, 'CATALOG_CANDIDATE_PROMOTED', 'catalog_candidate',
    candidate_row.id,
    pg_catalog.jsonb_build_object(
      'candidate_state', candidate_row.candidate_state,
      'provider', candidate_row.provider,
      'external_record_id', candidate_row.external_record_id
    ),
    after_summary, p_request_id
  );
  return after_summary;
end;
$$;

revoke all on function public.admin_review_catalog_candidate(uuid, timestamptz, text, text, text)
  from public, anon;
revoke all on function public.admin_promote_catalog_candidate(uuid, timestamptz, jsonb, text)
  from public, anon;
grant execute on function public.admin_review_catalog_candidate(uuid, timestamptz, text, text, text)
  to authenticated;
grant execute on function public.admin_promote_catalog_candidate(uuid, timestamptz, jsonb, text)
  to authenticated;

create index catalog_source_records_admin_queue_idx
  on public.catalog_source_records (candidate_state, provider, screen_status, updated_at desc);
