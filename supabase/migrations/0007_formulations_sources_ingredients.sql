create table public.formulations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  version integer not null,
  raw_ingredients text not null,
  normalized_ingredient_text text not null,
  ingredient_text_sha256 text not null,
  verification_status public.verification_status not null,
  confidence numeric(5, 4) null check (confidence between 0 and 1),
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  last_verified_at timestamptz null,
  active boolean not null default false,
  packaging_notes text null,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, version),
  unique (product_id, ingredient_text_sha256)
);

create table public.formulation_sources (
  id uuid primary key default gen_random_uuid(),
  formulation_id uuid not null references public.formulations(id) on delete cascade,
  source_type public.source_type not null,
  source_reference text null,
  source_url text null,
  evidence_asset_id uuid null references public.evidence_assets(id),
  observed_at timestamptz not null,
  submitted_by uuid null references auth.users(id),
  provenance_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.formulation_ingredients (
  id uuid primary key default gen_random_uuid(),
  formulation_id uuid not null references public.formulations(id) on delete cascade,
  ordinal integer not null,
  raw_label_value text not null,
  normalized_value text not null,
  parent_ordinal integer null,
  presence_kind text not null default 'DECLARED',
  parser_confidence numeric(5, 4) null,
  created_at timestamptz not null default now(),
  unique (formulation_id, ordinal)
);

create trigger formulations_set_updated_at
  before update on public.formulations
  for each row execute function public.set_updated_at();
