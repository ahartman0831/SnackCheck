create table public.compliance_evaluations (
  id uuid primary key default gen_random_uuid(),
  formulation_id uuid not null references public.formulations(id),
  ruleset_id uuid not null references public.rulesets(id),
  jurisdiction_id uuid not null references public.jurisdictions(id),
  context text not null,
  evaluation_date date not null,
  ingredient_status public.ingredient_status not null,
  applicability_status public.applicability_status not null,
  local_policy_status public.local_policy_status not null default 'NOT_REQUESTED',
  ruleset_hash text not null,
  formulation_hash text not null,
  quality_flags jsonb not null default '[]'::jsonb,
  engine_version text not null,
  explanation_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (
    formulation_id,
    ruleset_id,
    context,
    evaluation_date,
    ruleset_hash,
    formulation_hash
  )
);

create table public.evaluation_matches (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.compliance_evaluations(id) on delete cascade,
  prohibited_substance_id uuid not null references public.prohibited_substances(id),
  rule_alias_id uuid not null references public.rule_aliases(id),
  formulation_ingredient_id uuid null references public.formulation_ingredients(id),
  raw_label_value text not null,
  normalized_label_value text not null,
  matched_alias text not null,
  match_mode public.match_mode not null,
  created_at timestamptz not null default now()
);
