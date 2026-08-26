create table public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  type public.jurisdiction_type not null,
  name text not null,
  slug text not null,
  parent_id uuid null references public.jurisdictions(id),
  state_code text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, slug)
);

create table public.regulatory_sources (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id),
  source_type public.source_type not null,
  title text not null,
  citation text not null,
  url text not null,
  published_at date null,
  retrieved_at timestamptz not null,
  content_sha256 text null,
  archived_storage_path text null,
  notes text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger jurisdictions_set_updated_at
  before update on public.jurisdictions
  for each row execute function public.set_updated_at();

create trigger regulatory_sources_set_updated_at
  before update on public.regulatory_sources
  for each row execute function public.set_updated_at();
