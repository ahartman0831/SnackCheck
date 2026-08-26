create table public.products (
  id uuid primary key default gen_random_uuid(),
  gtin14 text null unique,
  primary_upc text null,
  brand text not null,
  name text not null,
  variant text null,
  size text null,
  category text null,
  slug text not null unique,
  image_url text null,
  image_attribution text null,
  search_document text not null default '',
  formulation_conflict boolean not null default false,
  individually_packaged boolean null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_identifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  identifier_type text not null check (
    identifier_type in ('UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'GTIN_14')
  ),
  raw_value text not null,
  normalized_gtin14 text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (identifier_type, raw_value)
);

create table public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique (product_id, normalized_alias)
);

create table public.product_redirects (
  id uuid primary key default gen_random_uuid(),
  from_slug text not null unique,
  to_product_id uuid not null references public.products(id),
  created_at timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
