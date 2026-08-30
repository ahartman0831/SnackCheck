create or replace function public.resolve_formulation_conflict(
  p_conflict_id uuid,
  p_expected_left_updated_at timestamptz,
  p_expected_right_updated_at timestamptz,
  p_decision text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  conflict_row public.data_conflicts%rowtype;
  left_row public.formulations%rowtype;
  right_row public.formulations%rowtype;
  winner_id uuid;
  remaining_open integer;
  before_summary jsonb;
  after_summary jsonb;
begin
  if actor_id is null
    or not public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active reviewer access is required';
  end if;

  if p_decision not in ('LEFT', 'RIGHT', 'NEITHER') then
    raise exception using errcode = '22023', message = 'unsupported conflict decision';
  end if;

  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;

  select * into conflict_row
  from public.data_conflicts
  where id = p_conflict_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'formulation conflict does not exist';
  end if;

  if conflict_row.status <> 'OPEN' or conflict_row.resolved_at is not null then
    raise exception using errcode = '40001', message = 'conflict changed; refresh before deciding';
  end if;

  select * into left_row
  from public.formulations
  where id = conflict_row.left_formulation_id
  for update;

  select * into right_row
  from public.formulations
  where id = conflict_row.right_formulation_id
  for update;

  if left_row.id is null or right_row.id is null
    or left_row.product_id <> conflict_row.product_id
    or right_row.product_id <> conflict_row.product_id then
    raise exception using errcode = '23514', message = 'conflict formulations do not match the product';
  end if;

  if left_row.updated_at is distinct from p_expected_left_updated_at
    or right_row.updated_at is distinct from p_expected_right_updated_at then
    raise exception using errcode = '40001', message = 'formulation changed; refresh before deciding';
  end if;

  winner_id := case p_decision
    when 'LEFT' then left_row.id
    when 'RIGHT' then right_row.id
    else null
  end;

  if winner_id is not null then
    if (
      winner_id = left_row.id
      and (
        left_row.verification_status not in ('VERIFIED', 'PACKAGE_VERIFIED')
        or left_row.last_verified_at is null
      )
    ) or (
      winner_id = right_row.id
      and (
        right_row.verification_status not in ('VERIFIED', 'PACKAGE_VERIFIED')
        or right_row.last_verified_at is null
      )
    )
      or not exists (
        select 1 from public.formulation_sources source
        where source.formulation_id = winner_id
      ) then
      raise exception using errcode = '23514', message = 'the selected formulation is not verified with source evidence';
    end if;
  end if;

  before_summary := jsonb_build_object(
    'status', conflict_row.status,
    'product_id', conflict_row.product_id,
    'left_formulation_id', left_row.id,
    'left_status', left_row.verification_status,
    'left_active', left_row.active,
    'right_formulation_id', right_row.id,
    'right_status', right_row.verification_status,
    'right_active', right_row.active
  );

  update public.formulations
  set active = false
  where product_id = conflict_row.product_id and active = true;

  if winner_id is not null then
    update public.formulations set active = true where id = winner_id;
  end if;

  update public.data_conflicts
  set status = case when winner_id is null then 'REJECTED' else 'RESOLVED' end,
      resolved_at = now()
  where id = conflict_row.id;

  select count(*) into remaining_open
  from public.data_conflicts
  where product_id = conflict_row.product_id
    and status = 'OPEN'
    and resolved_at is null;

  update public.products
  set formulation_conflict = remaining_open > 0
  where id = conflict_row.product_id;

  after_summary := jsonb_build_object(
    'status', case when winner_id is null then 'REJECTED' else 'RESOLVED' end,
    'product_id', conflict_row.product_id,
    'decision', p_decision,
    'active_formulation_id', winner_id,
    'remaining_open_conflicts', remaining_open
  );

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id,
    'FORMULATION_CONFLICT_' || case when winner_id is null then 'REJECTED' else 'RESOLVED' end,
    'formulation_conflict',
    conflict_row.id,
    before_summary,
    after_summary,
    p_request_id
  );

  return after_summary;
end;
$$;

revoke all on function public.resolve_formulation_conflict(uuid, timestamptz, timestamptz, text, text)
  from public, anon;
grant execute on function public.resolve_formulation_conflict(uuid, timestamptz, timestamptz, text, text)
  to authenticated;

create index if not exists data_conflicts_open_product_created_idx
  on public.data_conflicts (product_id, created_at desc)
  where status = 'OPEN' and resolved_at is null;
