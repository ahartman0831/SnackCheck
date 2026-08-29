create or replace function public.moderate_submission(
  p_submission_id uuid,
  p_expected_updated_at timestamptz,
  p_next_status public.submission_status,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  before_row public.submissions%rowtype;
  after_row public.submissions%rowtype;
  before_summary jsonb;
  after_summary jsonb;
begin
  if actor_id is null
    or not public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active reviewer access is required';
  end if;

  if p_next_status::text not in ('REVIEW_PENDING', 'APPROVED', 'REJECTED') then
    raise exception using errcode = '22023', message = 'unsupported moderation status';
  end if;

  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;

  select * into before_row
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'submission does not exist';
  end if;

  if before_row.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'submission changed; refresh before deciding';
  end if;

  before_summary := jsonb_build_object(
    'status', before_row.status,
    'updated_at', before_row.updated_at,
    'product_id', before_row.product_id,
    'evidence_asset_id', before_row.evidence_asset_id,
    'confirmed_formulation_hash', before_row.confirmed_formulation_hash
  );

  update public.submissions
  set status = p_next_status
  where id = p_submission_id
  returning * into after_row;

  after_summary := jsonb_build_object(
    'status', after_row.status,
    'updated_at', after_row.updated_at,
    'product_id', after_row.product_id,
    'evidence_asset_id', after_row.evidence_asset_id,
    'confirmed_formulation_hash', after_row.confirmed_formulation_hash
  );

  insert into public.admin_audit_log (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json,
    request_id
  ) values (
    actor_id,
    'SUBMISSION_' || p_next_status::text,
    'submission',
    p_submission_id,
    before_summary,
    after_summary,
    p_request_id
  );

  return after_summary;
end;
$$;

revoke all on function public.moderate_submission(uuid, timestamptz, public.submission_status, text)
  from public, anon;
grant execute on function public.moderate_submission(uuid, timestamptz, public.submission_status, text)
  to authenticated;

create index if not exists admin_audit_log_entity_created_idx
  on public.admin_audit_log (entity_type, entity_id, created_at desc);
