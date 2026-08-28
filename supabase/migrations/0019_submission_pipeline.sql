alter type public.submission_status add value if not exists 'SANITIZED';
alter type public.submission_status add value if not exists 'CANCELLED';

alter table public.submissions
  add column token_version smallint not null default 1,
  add column token_expires_at timestamptz null,
  add column ownership_revoked_at timestamptz null,
  add column raw_object_path text null,
  add column sanitized_object_path text null,
  add column raw_sha256 text null,
  add column sanitized_sha256 text null,
  add column raw_byte_size integer null,
  add column sanitized_byte_size integer null,
  add column sanitized_media_type text null,
  add column sanitized_width integer null,
  add column sanitized_height integer null,
  add column sanitizer_version text null,
  add column processing_started_at timestamptz null,
  add column sanitized_at timestamptz null,
  add column retention_until timestamptz null,
  add column processing_attempts smallint not null default 0;

alter table public.submissions
  add constraint submissions_token_version_positive check (token_version > 0),
  add constraint submissions_token_hash_shape check (
    anonymous_key_hash is null or anonymous_key_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint submissions_token_expiry_valid check (
    token_expires_at is null or token_expires_at > created_at
  ),
  add constraint submissions_raw_path_owned check (
    raw_object_path is null or raw_object_path like id::text || '/%'
  ),
  add constraint submissions_sanitized_path_owned check (
    sanitized_object_path is null or sanitized_object_path like id::text || '/%'
  ),
  add constraint submissions_distinct_object_paths check (
    raw_object_path is null
    or sanitized_object_path is null
    or raw_object_path <> sanitized_object_path
  ),
  add constraint submissions_sha256_shape check (
    (raw_sha256 is null or raw_sha256 ~ '^[0-9a-f]{64}$')
    and (sanitized_sha256 is null or sanitized_sha256 ~ '^[0-9a-f]{64}$')
  ),
  add constraint submissions_image_sizes_positive check (
    (raw_byte_size is null or raw_byte_size > 0)
    and (sanitized_byte_size is null or sanitized_byte_size > 0)
    and (sanitized_width is null or sanitized_width > 0)
    and (sanitized_height is null or sanitized_height > 0)
  ),
  add constraint submissions_processing_attempts_bounded check (
    processing_attempts between 0 and 10
  ),
  add constraint submissions_sanitized_fields_complete check (
    status::text <> 'SANITIZED'
    or (
      sanitized_object_path is not null
      and sanitized_sha256 is not null
      and sanitized_byte_size is not null
      and sanitized_media_type in ('image/jpeg', 'image/png', 'image/webp')
      and sanitized_width is not null
      and sanitized_height is not null
      and sanitizer_version is not null
      and sanitized_at is not null
      and retention_until is not null
    )
  );

create or replace function public.guard_submission_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  old_state text := old.status::text;
  new_state text := new.status::text;
begin
  if new_state = old_state then
    return new;
  end if;

  if not (
    (old_state = 'UPLOAD_PENDING' and new_state in ('UPLOADED', 'NEEDS_CONFIRMATION', 'FAILED', 'CANCELLED'))
    or (old_state = 'UPLOADED' and new_state in ('PROCESSING', 'FAILED', 'CANCELLED'))
    or (old_state = 'PROCESSING' and new_state in ('SANITIZED', 'FAILED'))
    or (old_state = 'SANITIZED' and new_state in ('NEEDS_CONFIRMATION', 'FAILED', 'CANCELLED'))
    or (old_state = 'NEEDS_CONFIRMATION' and new_state in ('CONFIRMED', 'FAILED', 'CANCELLED'))
    or (old_state = 'CONFIRMED' and new_state in ('EVALUATED', 'FAILED'))
    or (old_state = 'EVALUATED' and new_state in ('REVIEW_PENDING', 'APPROVED', 'REJECTED'))
    or (old_state = 'REVIEW_PENDING' and new_state in ('APPROVED', 'REJECTED'))
    or (old_state = 'FAILED' and new_state = 'CANCELLED')
  ) then
    raise exception 'illegal submission state transition: % -> %', old_state, new_state;
  end if;

  if new_state in ('CONFIRMED', 'EVALUATED', 'APPROVED', 'REJECTED', 'CANCELLED') then
    new.ownership_revoked_at := coalesce(new.ownership_revoked_at, now());
  end if;

  return new;
end;
$$;

create trigger submissions_guard_transition
  before update of status on public.submissions
  for each row execute function public.guard_submission_transition();

create or replace function public.guard_submission_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  evidence_bucket text;
  evidence_path text;
  evidence_hash text;
begin
  if new.evidence_asset_id is null then
    return new;
  end if;

  select bucket, storage_path, sha256
    into evidence_bucket, evidence_path, evidence_hash
  from public.evidence_assets
  where id = new.evidence_asset_id;

  if evidence_bucket <> 'submission-sanitized'
    or evidence_path <> new.sanitized_object_path
    or evidence_hash <> new.sanitized_sha256 then
    raise exception 'submission evidence does not match its sanitized object';
  end if;

  return new;
end;
$$;

create trigger submissions_guard_evidence
  before insert or update of evidence_asset_id, sanitized_object_path, sanitized_sha256
  on public.submissions
  for each row execute function public.guard_submission_evidence();

create index submissions_token_expiry_idx
  on public.submissions (token_expires_at)
  where ownership_revoked_at is null;

create index submissions_retention_idx
  on public.submissions (retention_until)
  where retention_until is not null;

create table public.submission_daily_counters (
  occurred_on date primary key default (timezone('utc', now()))::date,
  accepted_count integer not null default 0 check (accepted_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.submission_daily_counters enable row level security;
revoke all on public.submission_daily_counters from public, anon, authenticated;

insert into public.application_settings (key, value)
values
  ('photo_pipeline_kill_switch', 'true'::jsonb),
  ('photo_pipeline_daily_limit', '200'::jsonb)
on conflict (key) do nothing;

create or replace function public.claim_photo_processing_slot(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  disabled boolean;
  new_count integer;
begin
  if p_limit <= 0 then
    return false;
  end if;

  select coalesce((value #>> '{}')::boolean, true)
    into disabled
  from public.application_settings
  where key = 'photo_pipeline_kill_switch';

  if coalesce(disabled, true) then
    return false;
  end if;

  insert into public.submission_daily_counters (occurred_on, accepted_count)
  values ((timezone('utc', now()))::date, 1)
  on conflict (occurred_on) do update
    set accepted_count = public.submission_daily_counters.accepted_count + 1,
        updated_at = now()
    where public.submission_daily_counters.accepted_count < p_limit
  returning accepted_count into new_count;

  return new_count is not null and new_count <= p_limit;
end;
$$;

revoke all on function public.claim_photo_processing_slot(integer)
  from public, anon, authenticated;
grant execute on function public.claim_photo_processing_slot(integer) to service_role;

create or replace view public.expired_submission_assets
with (security_invoker = true)
as
select
  s.id as submission_id,
  s.raw_object_path,
  s.sanitized_object_path,
  s.evidence_asset_id
from public.submissions s
where s.retention_until is not null
  and s.retention_until <= now();

revoke all on public.expired_submission_assets from anon, authenticated;
grant select on public.expired_submission_assets to service_role;

revoke all on function public.guard_submission_transition() from public, anon, authenticated;
revoke all on function public.guard_submission_evidence() from public, anon, authenticated;
