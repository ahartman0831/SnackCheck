create table public.provider_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  lookup_key text not null,
  schema_version text not null,
  payload jsonb not null,
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (provider, lookup_key, schema_version)
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  anonymous_key_hash text not null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  occurred_on date not null default (timezone('utc', now()))::date,
  occurred_at timestamptz not null default now()
);

create table public.application_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
