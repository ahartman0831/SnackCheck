create or replace function public.persist_confirmed_submission_evaluation(
  p_submission_id uuid,
  p_corrected_text text,
  p_normalized_text text,
  p_formulation_hash text,
  p_ingredients jsonb,
  p_ruleset_id text,
  p_evaluation_result jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission_row public.submissions%rowtype;
  formulation_id_value uuid;
  evaluation_id_value uuid;
  next_version integer;
  ruleset_row record;
begin
  if length(pg_catalog.btrim(p_corrected_text)) = 0
    or length(p_corrected_text) > 10000
    or length(pg_catalog.btrim(p_normalized_text)) = 0
    or p_formulation_hash !~ '^[0-9a-f]{64}$'
    or pg_catalog.jsonb_typeof(p_ingredients) is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_evaluation_result) is distinct from 'object'
    or p_evaluation_result ->> 'formulationHash' is distinct from p_formulation_hash then
    return false;
  end if;

  select * into submission_row
  from public.submissions
  where id = p_submission_id
  for update;

  if not found or submission_row.status::text <> 'NEEDS_CONFIRMATION' then
    return false;
  end if;

  update public.submissions
  set status = 'CONFIRMED',
      corrected_text = p_corrected_text,
      confirmed_formulation_hash = p_formulation_hash,
      confirmed_at = pg_catalog.now(),
      anonymous_key_hash = null
  where id = p_submission_id;

  if submission_row.product_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(submission_row.product_id::text, 7)
    );

    select id into formulation_id_value
    from public.formulations
    where product_id = submission_row.product_id
      and ingredient_text_sha256 = p_formulation_hash;

    if formulation_id_value is null then
      select coalesce(pg_catalog.max(version), 0) + 1
      into next_version
      from public.formulations
      where product_id = submission_row.product_id;

      insert into public.formulations (
        product_id,
        version,
        raw_ingredients,
        normalized_ingredient_text,
        ingredient_text_sha256,
        verification_status,
        confidence,
        first_observed_at,
        last_observed_at,
        last_verified_at,
        active
      ) values (
        submission_row.product_id,
        next_version,
        p_corrected_text,
        p_normalized_text,
        p_formulation_hash,
        'COMMUNITY_SUBMITTED',
        submission_row.extraction_confidence,
        pg_catalog.now(),
        pg_catalog.now(),
        null,
        false
      )
      returning id into formulation_id_value;
    else
      update public.formulations
      set last_observed_at = greatest(last_observed_at, pg_catalog.now())
      where id = formulation_id_value;
    end if;

    if not exists (
      select 1
      from public.formulation_sources
      where formulation_id = formulation_id_value
        and source_reference = 'submission:' || p_submission_id::text
    ) then
      insert into public.formulation_sources (
        formulation_id,
        source_type,
        source_reference,
        evidence_asset_id,
        observed_at,
        provenance_json
      ) values (
        formulation_id_value,
        'COMMUNITY_SUBMISSION',
        'submission:' || p_submission_id::text,
        submission_row.evidence_asset_id,
        pg_catalog.now(),
        pg_catalog.jsonb_build_object(
          'submissionId', p_submission_id,
          'extractionProvider', submission_row.extraction_provider,
          'extractionModel', submission_row.extraction_model,
          'promptVersion', submission_row.prompt_version,
          'humanConfirmed', true
        )
      );
    end if;

    if not exists (
      select 1 from public.formulation_ingredients
      where formulation_id = formulation_id_value
    ) then
      insert into public.formulation_ingredients (
        formulation_id,
        ordinal,
        raw_label_value,
        normalized_value,
        parent_ordinal,
        presence_kind,
        parser_confidence
      )
      select
        formulation_id_value,
        ingredient.ordinal,
        ingredient.raw,
        ingredient.normalized,
        ingredient."parentOrdinal",
        case
          when ingredient."presenceKind" in ('DECLARED', 'PRECAUTIONARY', 'UNKNOWN')
            then ingredient."presenceKind"
          else 'UNKNOWN'
        end,
        submission_row.extraction_confidence
      from pg_catalog.jsonb_to_recordset(p_ingredients) as ingredient(
        ordinal integer,
        raw text,
        normalized text,
        "parentOrdinal" integer,
        "presenceKind" text
      )
      where ingredient.ordinal >= 0
        and coalesce(ingredient.raw, '') <> ''
        and coalesce(ingredient.normalized, '') <> ''
      on conflict (formulation_id, ordinal) do nothing;
    end if;

    if p_ruleset_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id, jurisdiction_id, ruleset_hash
      into ruleset_row
      from public.rulesets
      where id = p_ruleset_id::uuid
        and is_published = true
        and coalesce(ruleset_hash, '') <> ''
        and ruleset_hash = p_evaluation_result ->> 'rulesetHash';

      if found
        and p_evaluation_result ->> 'ingredientStatus' in ('PASS', 'FAIL', 'VERIFY')
        and p_evaluation_result ->> 'applicabilityStatus' in (
          'APPLIES',
          'PARENT_OWN_CHILD_EXCEPTION',
          'OUTSIDE_NORMAL_SCHOOL_DAY',
          'SCHOOL_NOT_CONFIRMED_PARTICIPATING',
          'UNKNOWN'
        )
        and p_evaluation_result ->> 'localPolicyStatus' in (
          'ALLOWED_BY_VERIFIED_POLICY',
          'RESTRICTED_BY_VERIFIED_POLICY',
          'NO_VERIFIED_POLICY',
          'NOT_REQUESTED'
        ) then
        insert into public.compliance_evaluations (
          formulation_id,
          ruleset_id,
          jurisdiction_id,
          context,
          evaluation_date,
          ingredient_status,
          applicability_status,
          local_policy_status,
          ruleset_hash,
          formulation_hash,
          quality_flags,
          engine_version,
          explanation_json
        ) values (
          formulation_id_value,
          ruleset_row.id,
          ruleset_row.jurisdiction_id,
          'CLASSROOM_DISTRIBUTION',
          ((p_evaluation_result ->> 'evaluatedAt')::timestamptz at time zone 'utc')::date,
          (p_evaluation_result ->> 'ingredientStatus')::public.ingredient_status,
          (p_evaluation_result ->> 'applicabilityStatus')::public.applicability_status,
          (p_evaluation_result ->> 'localPolicyStatus')::public.local_policy_status,
          ruleset_row.ruleset_hash,
          p_formulation_hash,
          coalesce(p_evaluation_result -> 'qualityFlags', '[]'::jsonb),
          p_evaluation_result ->> 'engineVersion',
          coalesce(p_evaluation_result -> 'explanation', '{}'::jsonb)
        )
        on conflict (
          formulation_id,
          ruleset_id,
          context,
          evaluation_date,
          ruleset_hash,
          formulation_hash
        ) do nothing
        returning id into evaluation_id_value;

        if evaluation_id_value is null then
          select id into evaluation_id_value
          from public.compliance_evaluations
          where formulation_id = formulation_id_value
            and ruleset_id = ruleset_row.id
            and context = 'CLASSROOM_DISTRIBUTION'
            and evaluation_date = ((p_evaluation_result ->> 'evaluatedAt')::timestamptz at time zone 'utc')::date
            and ruleset_hash = ruleset_row.ruleset_hash
            and formulation_hash = p_formulation_hash;
        end if;

        if evaluation_id_value is not null
          and pg_catalog.jsonb_typeof(p_evaluation_result -> 'matchedRules') = 'array' then
          insert into public.evaluation_matches (
            evaluation_id,
            prohibited_substance_id,
            rule_alias_id,
            formulation_ingredient_id,
            raw_label_value,
            normalized_label_value,
            matched_alias,
            match_mode
          )
          select
            evaluation_id_value,
            substance.id,
            alias.id,
            formulation_ingredient.id,
            match."rawLabelValue",
            match."normalizedLabelValue",
            match.alias,
            match."matchMode"::public.match_mode
          from pg_catalog.jsonb_to_recordset(
            p_evaluation_result -> 'matchedRules'
          ) as match(
            "substanceId" uuid,
            "aliasId" uuid,
            "formulationIngredientOrdinal" integer,
            "rawLabelValue" text,
            "normalizedLabelValue" text,
            alias text,
            "matchMode" text
          )
          join public.prohibited_substances substance
            on substance.id = match."substanceId"
           and substance.ruleset_id = ruleset_row.id
          join public.rule_aliases alias
            on alias.id = match."aliasId"
           and alias.prohibited_substance_id = substance.id
          left join public.formulation_ingredients formulation_ingredient
            on formulation_ingredient.formulation_id = formulation_id_value
           and formulation_ingredient.ordinal = match."formulationIngredientOrdinal"
          where match."matchMode" in ('EXACT_SEGMENT', 'TOKEN_SEQUENCE', 'REVIEWED_REGEX')
            and not exists (
              select 1 from public.evaluation_matches existing
              where existing.evaluation_id = evaluation_id_value
                and existing.rule_alias_id = alias.id
                and existing.raw_label_value = match."rawLabelValue"
            );
        end if;
      end if;
    end if;
  end if;

  update public.submissions
  set status = 'EVALUATED',
      evaluation_result_json = p_evaluation_result
  where id = p_submission_id
    and status::text = 'CONFIRMED';

  return found;
end;
$$;

revoke all on function public.persist_confirmed_submission_evaluation(
  uuid, text, text, text, jsonb, text, jsonb
) from public, anon, authenticated;
grant execute on function public.persist_confirmed_submission_evaluation(
  uuid, text, text, text, jsonb, text, jsonb
) to service_role;

revoke execute on function public.finalize_submission_evaluation(uuid, text, text, jsonb)
  from service_role;
drop function public.finalize_submission_evaluation(uuid, text, text, jsonb);
