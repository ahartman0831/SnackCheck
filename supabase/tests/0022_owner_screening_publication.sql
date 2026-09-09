-- Disposable test identities and rules only. Never run against a hosted project.
begin;
select plan(20);

insert into auth.users(id, aud, role) values
 ('82000000-0000-4000-8000-000000000001','authenticated','authenticated'),
 ('82000000-0000-4000-8000-000000000002','authenticated','authenticated'),
 ('82000000-0000-4000-8000-000000000003','authenticated','authenticated');
insert into public.admin_members(user_id,role,active) values
 ('82000000-0000-4000-8000-000000000001','REGULATORY_ADMIN',true),
 ('82000000-0000-4000-8000-000000000002','REVIEWER',true),
 ('82000000-0000-4000-8000-000000000003','REGULATORY_ADMIN',false);
create temporary table owner_rules_values as
select id, ruleset_hash as hash, null::uuid as draft_id, null::text as draft_hash from public.rulesets
where id='33333333-3333-3333-3333-333333333333';
grant select on owner_rules_values to authenticated;

select ok(not (public.ruleset_publication_blockers((select id from owner_rules_values)) @> array['signed reviewer and reviewed_at are required']), 'a separate review is not a publication blocker');
set local role anon;
select throws_ok($$select public.admin_publish_ruleset('33333333-3333-3333-3333-333333333333',repeat('a',64),null,'owner-anonymous')$$,'42501',null,'anonymous publication remains forbidden');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.admin_publish_ruleset((select id from owner_rules_values),(select hash from owner_rules_values),null,'owner-reviewer-denied')$$,'42501','active regulatory administrator access is required','catalog reviewer cannot publish');
select set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.admin_publish_ruleset((select id from owner_rules_values),(select hash from owner_rules_values),null,'owner-inactive-denied')$$,'42501','active regulatory administrator access is required','inactive admin cannot publish');
select set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.admin_publish_ruleset((select id from owner_rules_values),repeat('0',64),null,'owner-stale-hash')$$,'40001','ruleset changed; refresh before publishing','owner cannot approve stale content');
select throws_ok($$select public.admin_publish_ruleset((select id from owner_rules_values),(select hash from owner_rules_values),now(),'owner-stale-review')$$,'40001','ruleset changed; refresh before publishing','optional review state still uses optimistic concurrency');
reset role;
-- Missing provenance still blocks even if the hash is deliberately refreshed.
update public.ruleset_contexts set source_locator='' where ruleset_id=(select id from owner_rules_values);
update public.rulesets set ruleset_hash=public.ruleset_canonical_hash(id) where id=(select id from owner_rules_values);
update owner_rules_values set hash=(select ruleset_hash from public.rulesets where id=owner_rules_values.id);
set local role authenticated;
select throws_ok($$select public.admin_publish_ruleset((select id from owner_rules_values),(select hash from owner_rules_values),null,'owner-unsourced')$$,'P0001','ruleset publication requirements are not met','owner approval does not bypass source provenance');
reset role;
update public.ruleset_contexts set source_locator='Disposable sourced context fixture' where ruleset_id=(select id from owner_rules_values);
update public.rulesets set ruleset_hash=public.ruleset_canonical_hash(id) where id=(select id from owner_rules_values);
update owner_rules_values set hash=(select ruleset_hash from public.rulesets where id=owner_rules_values.id);
set local role authenticated;
select lives_ok($$select public.admin_publish_ruleset((select id from owner_rules_values),(select hash from owner_rules_values),null,'owner-publish-no-review')$$,'one active admin can approve and publish without independent review');
reset role;
select ok((select is_published and published_by='82000000-0000-4000-8000-000000000001' and published_at is not null and reviewed_by is null and reviewed_at is null from public.rulesets where id=(select id from owner_rules_values)), 'publication records the real actor/time without inventing a review');
select is((select count(*)::int from public.admin_audit_log where request_id='owner-publish-no-review' and action='RULESET_PUBLISHED' and actor_user_id='82000000-0000-4000-8000-000000000001' and after_json->>'approval_mode'='ADMIN_APPROVED'),1,'explicit admin approval is audited');
select throws_ok($$update public.rulesets set title='Tampered' where id=(select id from owner_rules_values)$$,'P0001','published rulesets are immutable except deactivation metadata','published content stays immutable');
select throws_ok($$update public.rulesets set published_at=now()+interval '1 second' where id=(select id from owner_rules_values)$$,'P0001','published rulesets are immutable except deactivation metadata','publication timestamp stays immutable');
select throws_ok($$update public.prohibited_substances set canonical_name='Tampered' where ruleset_id=(select id from owner_rules_values)$$,'P0001','published ruleset child rows are immutable','published substance content stays immutable');
set local role authenticated;
select throws_ok($$select public.admin_publish_ruleset((select id from owner_rules_values),(select hash from owner_rules_values),null,'owner-duplicate')$$,'40001','ruleset changed; refresh before publishing','duplicate publication is rejected');
reset role;
-- Reuse the audited clone path for rollback: copy the chosen earlier version into a new version.
update owner_rules_values set draft_id=public.admin_clone_ruleset_to_draft(id,hash,'owner-rollback-clone');
update owner_rules_values set draft_hash=(select ruleset_hash from public.rulesets where id=owner_rules_values.draft_id);
select is((select version from public.rulesets where id=(select draft_id from owner_rules_values)),2,'rollback clone gets a new version');
select ok((select not is_published and reviewed_by is null and published_at is null from public.rulesets where id=(select draft_id from owner_rules_values)), 'rollback clone requires a fresh approval and has no inherited signature');
set local role authenticated;
select lives_ok($$select public.admin_publish_ruleset((select draft_id from owner_rules_values),(select draft_hash from owner_rules_values),null,'owner-rollback-publish')$$,'owner can approve the cloned prior content as a new immutable release');
reset role;
select is((select id from public.current_published_arizona_ruleset()),(select draft_id from owner_rules_values),'latest published rollback version is selected');
select ok((select is_published and ruleset_hash=(select hash from owner_rules_values) from public.rulesets where id=(select id from owner_rules_values)), 'original published version and hash remain in history');
select is((select count(*)::int from public.admin_audit_log where request_id in ('owner-rollback-clone','owner-rollback-publish')),2,'rollback clone and publication are both audited');
select * from finish();
rollback;
