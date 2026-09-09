# Owner production handoff — ingredient-screening beta

Complete this one record using account/project identifiers and assignments. Share
credentials through the application's environment controls, never this file.
Staging `lhnbxjvqllohlbtdncyg` is not production. No new purchase is authorized here.

- Production Supabase project: **new, separate project approved in principle**;
  proposed name `SnackCheck Production`. Creation is pending cost approval; no
  production project reference exists yet.
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

**Next owner account action:** approve this additional Micro compute cost before
project creation. No billing change or paid project creation has occurred. The
creation form is prepared with the name `SnackCheck Production`; no password or
credentials have been generated or shared, and Create has not been submitted.

## Prepared database setup

- Release basis: `8b98d0fd1deedd091b6d51a7bd46a5a97786715e`, merged via PR #22;
  [all three main CI jobs passed](https://github.com/ahartman0831/SnackCheck/actions/runs/34355142034).
- [production-migrations.sha256](production-migrations.sha256) pins all 39 existing
  migration files from that release. Verify it from the repository root with
  `shasum -a 256 -c docs/release-review/production-migrations.sha256` before applying.
  No migration changes or new database architecture are needed for this handoff.
- After cost approval, create a fresh primary project in the existing Pro
  organization using Micro compute. Do not connect automatic GitHub deployments,
  enable paid add-ons, change other projects, or clone staging's user/content data.
- Use an isolated operator workspace for the new reference; reject the staging
  reference `lhnbxjvqllohlbtdncyg`. Confirm the new project is empty, inspect the
  migration plan, and apply migrations 0001–0039 only. Do not apply `seed.sql`,
  test fixtures, fabricated admin identities, or staging records.
- Verify migration history, generated types, RLS/grants, private storage and zero
  published rules. Migration 0015 creates draft regulatory data; it is not a rule
  publication or review signature. Keep proposals unsigned and disabled as shipped.
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
