# Owner production handoff — ingredient-screening beta

Complete this one record using account/project identifiers and assignments. Share
credentials through the application's environment controls, never this file.
Staging `lhnbxjvqllohlbtdncyg` is not production. The owner approved the additional
Micro compute cost on September 9; further paid services or add-ons need approval.

- Production Supabase project: **created and schema verified** `SnackCheck Production`,
  reference `lwkayhbmpirgpfytfryv`, Micro compute in `us-east-1`, existing Pro
  organization `fskvfbppeobixyxfoypb`. It is separate from staging and not connected
  to the public website.
- Production Vercel project and account: **owner confirmed** `snack-check-web` in
  `Hartman Dev`. Keep **Only build pre-production** enabled.
- Temporary website address: **owner confirmed for temporary private beta testing
  only** `https://snack-check-web.vercel.app`. This is not an SMTP or support-email
  domain, and is not a selected custom public domain. Actual private acceptance
  testing uses the access-protected Vercel Preview deployment; the existing public
  alias has not been repointed and Production settings remain unchanged.
- Real monitored `SUPPORT_EMAIL`: **deferred until launch preparation**. The owner
  prefers assistant triage of support messages and accepts personal Gmail only as
  a fallback. Do not treat that conditional answer as unconditional approval to
  publish the personal address.
- SMTP provider and verified sending domain: **deferred until launch preparation**.
  No custom SnackCheck domain is selected. Do not use `vercel.app` for SMTP or
  support email, and do not purchase or configure a domain now.
- Upstash: **owner approved and verified for protected Preview only**.
  `snackcheck-rate-limit`, database `7b21ca38-15ee-4123-a6af-a2df5307f6a9`, Free
  ($0/month), AWS us-east-1, no added read regions, eviction or paid add-ons.
  Production Redis configuration remains untouched.
- Alert recipient and operational contact: **pending owner**
- Backup plan/account and restore operator: **pending owner**
- Owner/admin rules approval: **pending owner**; independent expert review is optional

The registered OFF contact is already configured for staging and need not be
provided again. It is not automatically the site's support address.

## Domain decision — deferred by owner

Continue private-preview work that does not require a custom domain. Do not treat
SMTP or the public support address as the next blocking owner input while doing
that work. When a custom domain becomes necessary for launch preparation, present
up to three options with availability checked at that time, current annual prices
(including renewal pricing when different), and the exact intended use for the
website, login-email sender and support mailbox. Ask for purchase approval only
after that concrete comparison; no purchase, DNS setup or domain configuration is
authorized now. Availability and prices are not to be assumed from an old search.

## Protected Preview verification — September 9, 2026

The private acceptance checks below ran on the original three handoff commits at
`ce6dc3983381e098c42b33ce6f7d693b56c5f268`. PR #23 also includes the retention-runner
fix and these updated handoff notes. Its description records CI for the exact
current head separately from that earlier hosted acceptance evidence. A code
merge, public deployment and rules publication each remain separately gated.

- Current protected Preview:
  `https://snack-check-or5f7y5v6-hartman-dev.vercel.app`.
- New Supabase credentials, application secrets and Redis connection settings are
  scoped exclusively to Preview branch `codex/production-handoff`. Server values
  are Secret variables. `ALLOW_PREVIEW_MEMORY_RATE_LIMIT=false`.
- Redis-backed testing passed 41 functional checks and 10 shared-rate checks:
  database, one-time-code verification without sending mail, session refresh,
  authorization, ingredient confirmation, failure handling, shared HTTP 429 limits
  across two separate deployments, and recovery after natural counter expiry.
- Temporary auth users, memberships and submissions were removed. Storage remains
  empty. Camera, photo processing, paid AI and affiliates remain off; rules remain
  unsigned and unpublished, so ingredient results correctly remain VERIFY.
- Vercel Production variables, deployment protection, paused-build behavior and
  the public alias were verified unchanged. SMTP delivery, external alert delivery
  and a hosted backup/restore rehearsal are not claimed by these tests.

## Domain-independent operations checks — September 9, 2026

- The documented retention command initially failed before connecting because its
  top-level await was incompatible with the runner's CommonJS output. The
  entry-point fix preserves the dry-run default and explicit apply confirmation,
  and suppresses unexpected sensitive error details. It changes command execution,
  not the cleanup policy, and does not enable automatic deletion or scheduling.
- Ran the actual retention worker against `SnackCheck Production` with apply
  explicitly false: zero candidates, zero purged, zero failures. Missing credentials
  and apply mode without its exact confirmation were both refused in separate
  local checks. No deletion or retention schedule was enabled. An empty dry run
  does not establish that a real purge/restore cycle has been rehearsed.
- Read-only Supabase inspection shows scheduled daily backups and one physical
  backup at `2026-09-09 13:24:00 UTC`. No restore was started and no restore project,
  paid recovery feature or add-on was created. The contents and recovery of that
  backup have not been verified. Supabase explicitly excludes Storage API objects
  from database backups; object recovery remains a separate future requirement
  if photos are enabled.

## Proposed operational ownership — not implemented

Recommend Alex Hartman as the primary recipient of private operational alerts,
using his existing owner-controlled Gmail mailbox. This is an internal operations
destination, not a public support address or approval to publish it. Use the
existing provider/GitHub notification channels where suitable; a custom SnackCheck
sending domain is not a prerequisite for those provider-generated alerts. Prioritize
actionable availability failures, database/Redis failures, unexpected server errors,
and approaching provider quotas. Keep repeated unchanged events quiet.

The assistant can help triage and prepare actions during authorized sessions; it
is not a substitute for a reachable human recipient. Any automatic monitoring,
mailbox access, forwarding, alert delivery configuration or backup recipient must
be approved separately. Nothing is configured or scheduled by this recommendation.

## Rules approval and publication ownership — informational beta

The owner superseded the two-person requirement. Recommend Alex as the authorized
publishing admin; he may approve and publish a sourced version himself. Independent
human or expert review is optional and is not a launch blocker. See the
[informational-screening model](../informational-screening.md) for the protected
workflow, retained source/hash/audit controls and clone-based rollback.

Migration 0040 implements this policy without publishing or altering a ruleset.
It is proposed code only until separately applied to a hosted project. The current
production database still has migrations through 0039 and its existing controls.
No account/role is assigned, optional reviewer hired, fee authorized, review signed,
or rule published by this recommendation. Actual publication still needs explicit
owner authorization for the exact production version and hash.

## Account inspection — September 9, 2026

The existing CLI session and dashboard can access the owner's Supabase account.
Staging `SnackCheck` is in the existing Pro organization
`fskvfbppeobixyxfoypb` (`hartman.alex.88@gmail.com's Project`).

The new-project form explicitly blocks Free creation because the owner has reached
the two-active-free-project limit across organizations. Both slots belong to
existing Linehaul projects in `HartmanDev`; no unrelated project was paused,
deleted, transferred or upgraded. A new Free organization would not free a slot.

The existing Pro organization's form quotes **$10/month additional compute** for a
Micro instance (1 GB RAM, 2-core CPU). The
[compute billing documentation](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
lists $0.01344/hour, approximately $10/month, billed while the project runs.
This is additional compute, not a guaranteed total bill or a new Pro subscription;
other usage and taxes can apply. Compute is not covered by the Spend Cap.

**Approved and completed:** the owner approved the additional Micro cost, and the
new project was created on September 9. The dashboard confirms Healthy, Micro,
East US (North Virginia), no GitHub connection and no extra branches. The password
is newly generated and stored in a private, ignored operator directory; it is not
in source control, chat, or the application's environment settings.

**Remember for launch preparation:** the owner explicitly deferred support inbox
and assistant triage setup while the beta is not live. Revisit this with the owner
when ready to launch; it is not the next account action or a blocker to independent
engineering preparation. The preferred workflow is assistant review of SnackCheck
support messages, unsent reply drafts, and decisions brought back to the owner.
Hourly checks were proposed but have not been approved or scheduled. Do not start
monitoring, configure forwarding, publish an address, or send replies now.

Gmail profile access confirms the connected account is
`hartman.alex.88@gmail.com`; no mailbox contents were read during this capability
check. Codex can read relevant mail and prepare unsent drafts through the existing
connector. Mail still needs an owner-controlled mailbox; there is no separate
assistant-owned support address. No monitor, email forwarding, or automatic replies
have been enabled. Public address selection remains pending.

## Prepared database setup

- Release basis: `8b98d0fd1deedd091b6d51a7bd46a5a97786715e`, merged via PR #22;
  [all three main CI jobs passed](https://github.com/ahartman0831/SnackCheck/actions/runs/34355142034).
- [production-migrations.sha256](production-migrations.sha256) pins all 39 existing
  migration files from that release. Verify it from the repository root with
  `shasum -a 256 -c docs/release-review/production-migrations.sha256` before applying.
  No migration changes or new database architecture are needed for this handoff.
- Created a fresh primary project on the approved Micro tier. No automatic GitHub
  deployment, paid add-on, unrelated project change, or staging data copy occurred.
- Used an isolated operator workspace pinned to the new reference and rejecting
  staging. Preflight found zero public tables, auth users, storage buckets, or
  migration history. The repository's own CLI link still points to staging.
- Applied the exact 39 migration files, without `seed.sql`, test fixtures,
  fabricated admin identities, or staging records. Migrations 0001–0016 were
  applied atomically: legacy 0015 marks seed rules published, and 0016 removes that
  state. The transaction checked zero published rules before committing, so no
  committed or externally visible published interval occurred. Matching CLI history
  was recorded in that transaction; the normal migration runner applied 0017–0039.
- Readback confirms all 39 versions, zero pending migrations, 43 public tables
  with RLS, zero directly anonymous-readable tables, and service-role access as
  expected. The generated `Database.public` types match the release after syntax
  normalization. Hosted PostgREST metadata and the separately generated GraphQL
  schema are outside that application-schema comparison; committed types were not
  replaced with remote output.
- `submission-raw`, `submission-sanitized`, and `regulatory-archives` are private.
  The intended `product-images` bucket is public but empty. All storage is empty;
  products, formulations, submissions, auth users and admin members are also zero.
- Zero rules are published or signed; all 28 new color proposals remain disabled,
  unsigned and pending review. The production draft's canonical hash is
  `d1e669395135ffa51bd0f61bae6bf84cfa72e240c18306a7eb8ebc5b3f1e2508`.
  [Production payload](production-rules-payload.json) matches the frozen staging
  payload except for 18 generated alias IDs. The hash difference is expected;
  review and eventual publication must use the exact production hash, not a copied
  staging signature. Publication blockers for reviewer evidence and publisher
  remain enforced.
- Prepare new project credentials and separate random application secrets through
  secure environment controls when authorized; never copy staging credentials.
  Production environment changes and public deployment remain unauthorized.
- Keep camera/photo/paid AI/affiliates disabled. The new project is not launch-ready
  until the remaining SMTP, rate-limit, support, review and recovery inputs and
  their technical checks are complete.

## Execution after account approval and remaining handoff

After access is supplied, engineering performs the technical setup and records:

1. A private preview of the release commit using the correct production-target
   configuration; camera/photo/paid AI/affiliates remain off.
2. Schema setup from migrations 0001–0039 on the new project, generated types,
   private storage, role isolation and rules hash checks. Never generic `db push`
   the existing staging project: its recorded migration history differs from the
   manually applied, verified schema. Reconcile it separately if staging is reused.
3. Real admin OTP delivery, expired-session refresh/logout, unauthenticated denial,
   production Upstash enforcement, support contact and the full ingredient journey.
4. Synthetic health/alert delivery, agreed retention schedule with dry-run counts,
   backup restore into a separate project, and rollback to a known deployment.
5. Exact deployment URL/commit, verified published rules hash, results and remaining
   exceptions for the owner's final launch decision.

The owner approves accounts, costs, wording and public release. Local fixtures and
CI success do not count as successful production SMTP, provider, device or recovery
verification. A database backup alone does not establish image-object recovery;
verify storage recovery separately if photos are later enabled.
