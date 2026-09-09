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
- Temporary beta URL: **owner confirmed** `https://snack-check-web.vercel.app`.
  Custom public domain is deferred. This records the intended `NEXT_PUBLIC_APP_URL`;
  no production environment variable has been changed.
- Real monitored `SUPPORT_EMAIL`: **pending owner**
- SMTP provider and verified sending domain: **pending owner**
- Production Upstash project/account: **pending owner**
- Alert recipient and operational contact: **pending owner**
- Backup plan/account and restore operator: **pending owner**
- Rules reviewer and different publishing administrator: **pending owner**

The registered OFF contact is already configured for staging and need not be
provided again. It is not automatically the site's support address.

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

**Next owner input:** confirm the monitored public support inbox for the beta.
The OFF contact has not been reused as the support address without approval.

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
