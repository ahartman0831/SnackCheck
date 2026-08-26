create table public.districts (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null unique references public.jurisdictions(id),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null unique references public.jurisdictions(id),
  district_id uuid not null references public.districts(id),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_program_participation (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  program text not null,
  participating boolean not null,
  source_url text not null,
  source_title text not null,
  effective_from date not null,
  effective_until date null,
  verified_at date not null,
  created_at timestamptz not null default now()
);

create table public.local_policies (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id),
  policy_type text not null,
  summary text not null,
  source_url text not null,
  source_title text not null,
  effective_from date not null,
  effective_until date null,
  verification_status public.verification_status not null,
  verified_at date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger districts_set_updated_at
  before update on public.districts
  for each row execute function public.set_updated_at();

create trigger schools_set_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();

create trigger local_policies_set_updated_at
  before update on public.local_policies
  for each row execute function public.set_updated_at();
