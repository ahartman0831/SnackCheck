create table public.evidence_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  storage_path text not null unique,
  media_type text not null,
  byte_size integer not null,
  sha256 text not null,
  width integer null,
  height integer null,
  exif_stripped boolean not null default false,
  retention_until timestamptz null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'submission-raw',
    'submission-raw',
    false,
    12582912,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  ),
  (
    'submission-sanitized',
    'submission-sanitized',
    false,
    3145728,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'product-images',
    'product-images',
    true,
    3145728,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'regulatory-archives',
    'regulatory-archives',
    false,
    20971520,
    array['application/pdf', 'text/plain', 'image/jpeg', 'image/png']
  )
on conflict (id) do nothing;
