create table public.rulesets (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id),
  code text not null,
  version integer not null,
  title text not null,
  effective_from date not null,
  effective_until date null,
  published_at timestamptz null,
  is_published boolean not null default false,
  ruleset_hash text null,
  freshness_current_days integer not null default 180,
  freshness_aging_days integer not null default 365,
  notes text null,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (code, version)
);

create table public.ruleset_contexts (
  id uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null references public.rulesets(id),
  context text not null,
  applicability_status public.applicability_status not null,
  regulatory_source_id uuid not null references public.regulatory_sources(id),
  source_locator text null,
  public_summary text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (ruleset_id, context)
);

create table public.prohibited_substances (
  id uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null references public.rulesets(id),
  canonical_name text not null,
  canonical_normalized text not null,
  statutory_ordinal integer not null,
  regulatory_source_id uuid not null references public.regulatory_sources(id),
  source_locator text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (ruleset_id, canonical_normalized),
  unique (ruleset_id, statutory_ordinal)
);

create table public.rule_aliases (
  id uuid primary key default gen_random_uuid(),
  prohibited_substance_id uuid not null references public.prohibited_substances(id),
  alias text not null,
  normalized_alias text not null,
  match_mode public.match_mode not null default 'TOKEN_SEQUENCE',
  review_status public.alias_review_status not null,
  enabled boolean not null default false,
  regulatory_source_id uuid null references public.regulatory_sources(id),
  reviewed_by uuid null references auth.users(id),
  reviewed_at timestamptz null,
  review_notes text null,
  created_at timestamptz not null default now(),
  unique (prohibited_substance_id, normalized_alias)
);
