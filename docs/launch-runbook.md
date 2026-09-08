# Launch runbook

Current release authority: `SNACKCHECK_TAKEOVER_AUDIT.md`, `DEFINITION_OF_DONE.md`, and `RELEASE_AUDIT.md`. Historical deployment notes below are not fresh production verification.

## Runtime

- Node.js 22+ is required (`package.json` `engines.node` and CI `setup-node` 22). `.nvmrc` pins Node 22.23.2 for local work.
- P0-5 is fixed on the Phase 6 branch with signed, expiring ownership tokens and stored token hashes. Phase 6 CI is green, but do not enable ingredient-photo submissions until Phase 7 is complete and rollout is separately approved.
- Phase 5 is barcode camera only. It must not change submission tokens or the image pipeline.

## CI

GitHub Actions on `ubuntu-latest` is the authorized non-production environment for database and WebKit gates. It must never run `supabase link`, `supabase db push`, or `supabase gen types --linked`.

- `verify`: format, lint, typecheck, all unit tests including the P0-5 regression, integration tests, and production build.
- `database`: local `supabase start`, reset through the latest migration, pgTAP, local type generation plus a short-lived generated-types artifact, a second reset, and pgTAP again.
- `e2e-webkit`: Playwright `mobile-webkit` on a runner that supports WebKit.

## Not yet deployed

- Production Supabase project: pending
- Vercel project: `snack-check-web` exists; protected Phase 5 preview is ready, while the initial camera-off production build failed before publishing
- Domain: pending (`NEXT_PUBLIC_APP_URL`; historical working domain was CanIBringThis.com)
- Published ruleset hash: pending
- Engine version: `0.1.1`
- Vision model: pending
- Regulatory review date: pending

## Rollback

1. Revert the Vercel deployment to the previous successful build.
2. Do not rewrite applied production migrations; add a forward fix.
3. Keep the previous published ruleset effective until a reviewed replacement is published.

The tested non-production procedures and remaining human assignments are documented in [`operations-monitoring-and-recovery.md`](operations-monitoring-and-recovery.md). CI rehearses a disposable PostgreSQL data backup/restore; production restore and Vercel promotion/rollback remain launch gates.

## Takeover migration and environment checklist

Apply migration `0037` before releasing the corresponding engine. It changes only
freshness evaluation (future dates fail closed; function is stable), not stored
data or signatures. Re-run database assertions and verify the reviewed ruleset and
launch products after any migration. No hosted migration was applied in takeover.

Next.js reads `apps/web/.env.local` locally; deployment secrets belong in Vercel's
environment for the correct project. A root `.env.local` alone does not configure
the web app. Set `SUPPORT_EMAIL` before building a release. Both HMAC secrets need
at least 32 characters. Production uses Upstash; preview-memory fallback is forbidden
on production even if its flag is set. Per-visitor limits trust only Vercel's
platform-provided IP header; self-hosted deployments require a reviewed equivalent
proxy adapter, otherwise they deliberately share a conservative bucket.

Production still requires owner-controlled SMTP, legal/privacy review, monitoring
configuration, retention scheduling, recovery rehearsal and explicit public launch
approval. Optional camera/photo/AI and affiliate features stay disabled until their
independent acceptance criteria pass.
