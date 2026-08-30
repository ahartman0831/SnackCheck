create or replace function public.admin_clone_ruleset_to_draft(
  p_source_ruleset_id uuid,
  p_expected_hash text,
  p_request_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  source_row public.rulesets%rowtype;
  draft_id uuid;
  draft_row public.rulesets%rowtype;
begin
  if actor_id is null
    or not public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active regulatory administrator access is required';
  end if;
  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;

  select * into source_row from public.rulesets
  where id = p_source_ruleset_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'source ruleset does not exist';
  end if;
  if not source_row.is_published then
    raise exception using errcode = '23514', message = 'only a published ruleset can be cloned';
  end if;
  if source_row.ruleset_hash is distinct from p_expected_hash
    or public.ruleset_canonical_hash(source_row.id) is distinct from p_expected_hash then
    raise exception using errcode = '40001', message = 'ruleset changed; refresh before cloning';
  end if;

  draft_id := public.clone_ruleset_to_draft(source_row.id);
  select * into draft_row from public.rulesets where id = draft_id;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id, 'RULESET_CLONED_TO_DRAFT', 'ruleset', draft_id,
    jsonb_build_object('source_ruleset_id', source_row.id, 'source_version', source_row.version, 'source_hash', source_row.ruleset_hash),
    jsonb_build_object('draft_ruleset_id', draft_id, 'draft_version', draft_row.version, 'draft_hash', draft_row.ruleset_hash),
    p_request_id
  );
  return draft_id;
end;
$$;

create or replace function public.admin_review_ruleset(
  p_ruleset_id uuid,
  p_expected_hash text,
  p_document_url text,
  p_document_hash text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  before_row public.rulesets%rowtype;
  after_row public.rulesets%rowtype;
begin
  if actor_id is null
    or not public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active regulatory administrator access is required';
  end if;
  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;
  if p_document_url !~ '^https://[^[:space:]]+$'
    or p_document_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'an HTTPS review document and lowercase SHA-256 are required';
  end if;

  select * into before_row from public.rulesets
  where id = p_ruleset_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ruleset does not exist';
  end if;
  if before_row.is_published then
    raise exception using errcode = '23514', message = 'published rulesets cannot be reviewed in place';
  end if;
  if before_row.ruleset_hash is distinct from p_expected_hash
    or public.ruleset_canonical_hash(before_row.id) is distinct from p_expected_hash then
    raise exception using errcode = '40001', message = 'ruleset changed; refresh before reviewing';
  end if;

  perform public.review_ruleset(
    before_row.id, actor_id, p_document_url, p_document_hash
  );
  select * into after_row from public.rulesets where id = before_row.id;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id, 'RULESET_REVIEW_RECORDED', 'ruleset', before_row.id,
    jsonb_build_object('ruleset_hash', before_row.ruleset_hash, 'reviewed_by', before_row.reviewed_by, 'reviewed_at', before_row.reviewed_at),
    jsonb_build_object('ruleset_hash', after_row.ruleset_hash, 'reviewed_by', after_row.reviewed_by, 'reviewed_at', after_row.reviewed_at, 'review_document_hash', after_row.review_document_hash),
    p_request_id
  );

  return jsonb_build_object('ruleset_id', after_row.id, 'ruleset_hash', after_row.ruleset_hash, 'reviewed_at', after_row.reviewed_at);
end;
$$;

create or replace function public.admin_publish_ruleset(
  p_ruleset_id uuid,
  p_expected_hash text,
  p_expected_reviewed_at timestamptz,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  before_row public.rulesets%rowtype;
  after_row public.rulesets%rowtype;
begin
  if actor_id is null
    or not public.is_active_admin(array['REGULATORY_ADMIN', 'SUPER_ADMIN']) then
    raise exception using errcode = '42501', message = 'active regulatory administrator access is required';
  end if;
  if p_request_id is null or length(p_request_id) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'a valid request id is required';
  end if;

  select * into before_row from public.rulesets
  where id = p_ruleset_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ruleset does not exist';
  end if;
  if before_row.is_published then
    raise exception using errcode = '40001', message = 'ruleset changed; refresh before publishing';
  end if;
  if before_row.ruleset_hash is distinct from p_expected_hash
    or public.ruleset_canonical_hash(before_row.id) is distinct from p_expected_hash
    or before_row.reviewed_at is distinct from p_expected_reviewed_at then
    raise exception using errcode = '40001', message = 'ruleset changed; refresh before publishing';
  end if;
  if before_row.reviewed_by is null or before_row.reviewed_by = actor_id then
    raise exception using errcode = '23514', message = 'publisher must be different from the signed reviewer';
  end if;

  perform public.publish_ruleset(before_row.id, actor_id);
  select * into after_row from public.rulesets where id = before_row.id;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, request_id
  ) values (
    actor_id, 'RULESET_PUBLISHED', 'ruleset', before_row.id,
    jsonb_build_object('ruleset_hash', before_row.ruleset_hash, 'reviewed_by', before_row.reviewed_by, 'reviewed_at', before_row.reviewed_at, 'is_published', before_row.is_published),
    jsonb_build_object('ruleset_hash', after_row.ruleset_hash, 'published_by', after_row.published_by, 'published_at', after_row.published_at, 'is_published', after_row.is_published),
    p_request_id
  );

  return jsonb_build_object('ruleset_id', after_row.id, 'ruleset_hash', after_row.ruleset_hash, 'published_at', after_row.published_at);
end;
$$;

revoke execute on function public.clone_ruleset_to_draft(uuid) from authenticated;
revoke execute on function public.review_ruleset(uuid, uuid, text, text) from authenticated;
revoke execute on function public.publish_ruleset(uuid, uuid) from authenticated;

revoke all on function public.admin_clone_ruleset_to_draft(uuid, text, text) from public, anon;
revoke all on function public.admin_review_ruleset(uuid, text, text, text, text) from public, anon;
revoke all on function public.admin_publish_ruleset(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.admin_clone_ruleset_to_draft(uuid, text, text) to authenticated;
grant execute on function public.admin_review_ruleset(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_publish_ruleset(uuid, text, timestamptz, text) to authenticated;
