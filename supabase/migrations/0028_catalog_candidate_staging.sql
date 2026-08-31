create table public.catalog_import_batches (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('USDA_FDC', 'OPEN_FOOD_FACTS')),
  dataset_release text not null check (length(btrim(dataset_release)) between 1 and 160),
  source_url text not null check (source_url ~ '^https://'),
  license_identifier text not null check (length(btrim(license_identifier)) between 1 and 120),
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  file_byte_size bigint not null check (file_byte_size >= 0),
  mode text not null check (mode in ('DRY_RUN', 'APPLY')),
  status text not null default 'STARTED' check (status in ('STARTED', 'COMPLETED', 'FAILED')),
  parser_version text not null,
  normalizer_version text not null,
  engine_version text,
  ruleset_hash text check (ruleset_hash is null or ruleset_hash ~ '^[0-9a-f]{64}$'),
  rows_read integer not null default 0 check (rows_read >= 0),
  rows_accepted integer not null default 0 check (rows_accepted >= 0),
  rows_rejected integer not null default 0 check (rows_rejected >= 0),
  rows_unchanged integer not null default 0 check (rows_unchanged >= 0),
  rows_superseded integer not null default 0 check (rows_superseded >= 0),
  error_counts jsonb not null default '{}'::jsonb check (jsonb_typeof(error_counts) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'STARTED' and completed_at is null)
    or (status in ('COMPLETED', 'FAILED') and completed_at is not null)
  )
);

create table public.catalog_source_records (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.catalog_import_batches(id) on delete restrict,
  provider text not null check (provider in ('USDA_FDC', 'OPEN_FOOD_FACTS')),
  external_record_id text not null check (length(btrim(external_record_id)) between 1 and 200),
  source_version text not null check (length(btrim(source_version)) between 1 and 200),
  source_record_sha256 text not null check (source_record_sha256 ~ '^[0-9a-f]{64}$'),
  source_gtin text not null,
  normalized_gtin14 text not null check (normalized_gtin14 ~ '^[0-9]{14}$'),
  brand text not null check (length(btrim(brand)) between 1 and 200),
  product_name text not null check (length(btrim(product_name)) between 1 and 300),
  variant text,
  size text,
  category text,
  raw_ingredient_text text not null check (length(btrim(raw_ingredient_text)) > 0),
  normalized_ingredient_text text not null check (length(btrim(normalized_ingredient_text)) > 0),
  ingredient_text_sha256 text not null check (ingredient_text_sha256 ~ '^[0-9a-f]{64}$'),
  market_country text not null,
  source_modified_at timestamptz,
  source_published_at timestamptz,
  discontinued boolean not null default false,
  source_url text not null check (source_url ~ '^https://'),
  source_reference text not null,
  license_identifier text not null,
  attribution text,
  screen_status public.ingredient_status not null,
  quality_flags jsonb not null default '[]'::jsonb check (jsonb_typeof(quality_flags) = 'array'),
  matched_rule_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(matched_rule_ids) = 'array'),
  engine_version text not null,
  ruleset_hash text not null check (ruleset_hash ~ '^[0-9a-f]{64}$'),
  candidate_state text not null check (candidate_state in (
    'IMPORTED', 'SCREENED_PASS', 'SCREENED_FAIL', 'SCREENED_VERIFY',
    'REVIEW_QUEUED', 'PROMOTED', 'REJECTED', 'SUPERSEDED'
  )),
  superseded_by_id uuid references public.catalog_source_records(id) on delete restrict,
  canonical_product_id uuid references public.products(id) on delete restrict,
  canonical_formulation_id uuid references public.formulations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_record_id, source_version, source_record_sha256),
  check (
    (candidate_state = 'PROMOTED' and canonical_product_id is not null and canonical_formulation_id is not null)
    or candidate_state <> 'PROMOTED'
  )
);

create index catalog_source_records_gtin_idx
  on public.catalog_source_records (normalized_gtin14, candidate_state);
create index catalog_source_records_review_idx
  on public.catalog_source_records (candidate_state, screen_status, created_at desc);
create index catalog_source_records_external_idx
  on public.catalog_source_records (provider, external_record_id, created_at desc);

alter table public.catalog_import_batches enable row level security;
alter table public.catalog_source_records enable row level security;

revoke all on public.catalog_import_batches from public, anon, authenticated;
revoke all on public.catalog_source_records from public, anon, authenticated;
grant select on public.catalog_import_batches to service_role;
grant select on public.catalog_source_records to service_role;

create or replace function public.create_catalog_import_batch(p_batch jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_id uuid;
begin
  if pg_catalog.jsonb_typeof(p_batch) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'batch must be an object';
  end if;

  insert into public.catalog_import_batches (
    provider, dataset_release, source_url, license_identifier,
    file_sha256, file_byte_size, mode, parser_version, normalizer_version,
    engine_version, ruleset_hash
  ) values (
    p_batch ->> 'provider', p_batch ->> 'datasetRelease', p_batch ->> 'sourceUrl',
    p_batch ->> 'licenseIdentifier', p_batch ->> 'fileSha256',
    (p_batch ->> 'fileByteSize')::bigint, p_batch ->> 'mode',
    p_batch ->> 'parserVersion', p_batch ->> 'normalizerVersion',
    p_batch ->> 'engineVersion', p_batch ->> 'rulesetHash'
  ) returning id into batch_id;

  return batch_id;
end;
$$;

create or replace function public.import_catalog_source_record(p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
  current_id uuid;
  current_modified_at timestamptz;
  incoming_modified_at timestamptz;
  new_id uuid;
  superseded_count integer;
  state_value text;
  successor_id uuid;
begin
  if pg_catalog.jsonb_typeof(p_record) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'record must be an object';
  end if;

  select id into existing_id
  from public.catalog_source_records
  where provider = p_record ->> 'provider'
    and external_record_id = p_record ->> 'externalRecordId'
    and source_version = p_record ->> 'sourceVersion'
    and source_record_sha256 = p_record ->> 'sourceRecordSha256';
  if existing_id is not null then
    return pg_catalog.jsonb_build_object('action', 'unchanged', 'recordId', existing_id, 'superseded', 0);
  end if;

  state_value := case p_record ->> 'screenStatus'
    when 'PASS' then 'SCREENED_PASS'
    when 'FAIL' then 'SCREENED_FAIL'
    else 'SCREENED_VERIFY'
  end;
  incoming_modified_at := nullif(p_record ->> 'sourceModifiedAt', '')::timestamptz;

  select id, source_modified_at into current_id, current_modified_at
  from public.catalog_source_records
  where provider = p_record ->> 'provider'
    and external_record_id = p_record ->> 'externalRecordId'
    and candidate_state not in ('PROMOTED', 'REJECTED', 'SUPERSEDED')
  order by source_modified_at desc nulls last, created_at desc
  limit 1
  for update;

  if current_id is not null
    and current_modified_at is not null
    and (incoming_modified_at is null or incoming_modified_at < current_modified_at) then
    state_value := 'SUPERSEDED';
    successor_id := current_id;
  end if;

  insert into public.catalog_source_records (
    import_batch_id, provider, external_record_id, source_version,
    source_record_sha256, source_gtin, normalized_gtin14, brand, product_name,
    variant, size, category, raw_ingredient_text, normalized_ingredient_text,
    ingredient_text_sha256, market_country, source_modified_at,
    source_published_at, discontinued, source_url, source_reference,
    license_identifier, attribution, screen_status, quality_flags,
    matched_rule_ids, engine_version, ruleset_hash, candidate_state, superseded_by_id
  ) values (
    (p_record ->> 'importBatchId')::uuid, p_record ->> 'provider',
    p_record ->> 'externalRecordId', p_record ->> 'sourceVersion',
    p_record ->> 'sourceRecordSha256', p_record ->> 'sourceGtin',
    p_record ->> 'normalizedGtin14', p_record ->> 'brand', p_record ->> 'productName',
    nullif(p_record ->> 'variant', ''), nullif(p_record ->> 'size', ''),
    nullif(p_record ->> 'category', ''), p_record ->> 'rawIngredientText',
    p_record ->> 'normalizedIngredientText', p_record ->> 'ingredientTextSha256',
    p_record ->> 'marketCountry', nullif(p_record ->> 'sourceModifiedAt', '')::timestamptz,
    nullif(p_record ->> 'sourcePublishedAt', '')::timestamptz,
    coalesce((p_record ->> 'discontinued')::boolean, false),
    p_record ->> 'sourceUrl', p_record ->> 'sourceReference',
    p_record ->> 'licenseIdentifier', nullif(p_record ->> 'attribution', ''),
    (p_record ->> 'screenStatus')::public.ingredient_status,
    coalesce(p_record -> 'qualityFlags', '[]'::jsonb),
    coalesce(p_record -> 'matchedRuleIds', '[]'::jsonb),
    p_record ->> 'engineVersion', p_record ->> 'rulesetHash', state_value, successor_id
  ) returning id into new_id;

  if successor_id is null then
    update public.catalog_source_records
    set candidate_state = 'SUPERSEDED', superseded_by_id = new_id, updated_at = pg_catalog.now()
    where provider = p_record ->> 'provider'
      and external_record_id = p_record ->> 'externalRecordId'
      and id <> new_id
      and candidate_state not in ('PROMOTED', 'REJECTED', 'SUPERSEDED');
    get diagnostics superseded_count = row_count;
  else
    superseded_count := 0;
  end if;

  return pg_catalog.jsonb_build_object(
    'action', 'created', 'recordId', new_id, 'superseded', superseded_count
  );
end;
$$;

create or replace function public.complete_catalog_import_batch(p_batch_id uuid, p_summary jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.jsonb_typeof(p_summary) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'summary must be an object';
  end if;

  update public.catalog_import_batches
  set status = p_summary ->> 'status',
      rows_read = (p_summary ->> 'rowsRead')::integer,
      rows_accepted = (p_summary ->> 'rowsAccepted')::integer,
      rows_rejected = (p_summary ->> 'rowsRejected')::integer,
      rows_unchanged = (p_summary ->> 'rowsUnchanged')::integer,
      rows_superseded = (p_summary ->> 'rowsSuperseded')::integer,
      error_counts = coalesce(p_summary -> 'errorCounts', '{}'::jsonb),
      completed_at = pg_catalog.now()
  where id = p_batch_id and status = 'STARTED';

  if not found then
    raise exception using errcode = 'P0002', message = 'open import batch does not exist';
  end if;
end;
$$;

revoke all on function public.create_catalog_import_batch(jsonb) from public, anon, authenticated;
revoke all on function public.import_catalog_source_record(jsonb) from public, anon, authenticated;
revoke all on function public.complete_catalog_import_batch(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_catalog_import_batch(jsonb) to service_role;
grant execute on function public.import_catalog_source_record(jsonb) to service_role;
grant execute on function public.complete_catalog_import_batch(uuid, jsonb) to service_role;
