create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid null references public.products(id),
  scanned_identifier text null,
  normalized_gtin14 text null,
  evidence_asset_id uuid null references public.evidence_assets(id),
  status public.submission_status not null,
  extracted_raw_text text null,
  extracted_ingredients jsonb null,
  corrected_text text null,
  extraction_confidence numeric(5, 4) null,
  extraction_provider text null,
  extraction_model text null,
  prompt_version text null,
  image_sha256 text null,
  anonymous_key_hash text null,
  failure_code text null,
  failure_detail_safe text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.data_conflicts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  left_formulation_id uuid not null references public.formulations(id),
  right_formulation_id uuid not null references public.formulations(id),
  status text not null default 'OPEN',
  notes text null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create trigger submissions_set_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();
