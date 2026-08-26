create table public.admin_members (
  user_id uuid primary key references auth.users(id),
  role public.admin_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  before_json jsonb null,
  after_json jsonb null,
  request_id text null,
  created_at timestamptz not null default now()
);

create or replace function public.is_active_admin(required_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_members
    where user_id = auth.uid()
      and active = true
      and (
        required_roles is null
        or role::text = any (required_roles)
      )
  );
$$;
