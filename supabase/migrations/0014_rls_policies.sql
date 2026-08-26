alter table public.jurisdictions enable row level security;
alter table public.regulatory_sources enable row level security;
alter table public.rulesets enable row level security;
alter table public.ruleset_contexts enable row level security;
alter table public.prohibited_substances enable row level security;
alter table public.rule_aliases enable row level security;
alter table public.evidence_assets enable row level security;
alter table public.products enable row level security;
alter table public.product_identifiers enable row level security;
alter table public.product_aliases enable row level security;
alter table public.product_redirects enable row level security;
alter table public.formulations enable row level security;
alter table public.formulation_sources enable row level security;
alter table public.formulation_ingredients enable row level security;
alter table public.compliance_evaluations enable row level security;
alter table public.evaluation_matches enable row level security;
alter table public.districts enable row level security;
alter table public.schools enable row level security;
alter table public.school_program_participation enable row level security;
alter table public.local_policies enable row level security;
alter table public.submissions enable row level security;
alter table public.data_conflicts enable row level security;
alter table public.admin_members enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.provider_cache enable row level security;
alter table public.analytics_events enable row level security;
alter table public.application_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage on schema public to authenticated;
grant execute on function public.is_active_admin(text[]) to authenticated;

-- Reviewer: read product, formulation, submission, and conflict records.
create policy reviewer_read_products on public.products
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_read_formulations on public.formulations
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_read_formulation_sources on public.formulation_sources
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_read_formulation_ingredients on public.formulation_ingredients
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_read_submissions on public.submissions
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_read_conflicts on public.data_conflicts
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_read_evidence on public.evidence_assets
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_read_identifiers on public.product_identifiers
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_read_product_aliases on public.product_aliases
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

-- Regulatory admin: sources, rulesets, aliases.
create policy regulatory_read_sources on public.regulatory_sources
  for select to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy regulatory_read_rulesets on public.rulesets
  for select to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy regulatory_read_contexts on public.ruleset_contexts
  for select to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy regulatory_read_substances on public.prohibited_substances
  for select to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy regulatory_read_aliases on public.rule_aliases
  for select to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy reviewer_cannot_update_aliases on public.rule_aliases
  for update to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']))
  with check (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy regulatory_update_rulesets on public.rulesets
  for update to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']))
  with check (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

-- Super admin: membership and audit.
create policy super_admin_members on public.admin_members
  for all to authenticated
  using (public.is_active_admin(array['SUPER_ADMIN']))
  with check (public.is_active_admin(array['SUPER_ADMIN']));

create policy super_admin_audit on public.admin_audit_log
  for select to authenticated
  using (public.is_active_admin(array['SUPER_ADMIN']));

create policy admin_read_schools on public.schools
  for select to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy admin_read_districts on public.districts
  for select to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy admin_read_policies on public.local_policies
  for select to authenticated
  using (public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']));

create policy admin_read_evaluations on public.compliance_evaluations
  for select to authenticated
  using (public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN']));

-- Storage: no direct anon writes. Service role bypasses RLS.
create policy no_anon_storage_select on storage.objects
  for select to anon
  using (false);

create policy no_anon_storage_insert on storage.objects
  for insert to anon
  with check (false);

create policy admin_storage_read on storage.objects
  for select to authenticated
  using (
    public.is_active_admin(array['REVIEWER', 'REGULATORY_ADMIN', 'SUPER_ADMIN'])
    and bucket_id in ('submission-sanitized', 'product-images', 'regulatory-archives')
  );
