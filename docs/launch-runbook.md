# Launch runbook

This file is completed in Phase 10.

## Runtime

- Node.js 22+ is required (`package.json` `engines.node` and CI `setup-node` 22). This repository does not pin nvm, fnm, or Volta.
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
- Engine version: `0.1.0`
- Vision model: pending
- Regulatory review date: pending

## Rollback

1. Revert the Vercel deployment to the previous successful build.
2. Do not rewrite applied production migrations; add a forward fix.
3. Keep the previous published ruleset effective until a reviewed replacement is published.
