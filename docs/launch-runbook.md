# Launch runbook

This file is completed in Phase 10.

## Runtime

- Node.js 22+ is required (`package.json` `engines.node` and CI `setup-node` 22). This repository does not pin nvm, fnm, or Volta.
- P0-5 (forgeable `${id}.*` submission cookie) is a Phase 6 gate. Do not enable ingredient-photo submissions until it is green.
- Phase 5 is barcode camera only. It must not change submission tokens or the image pipeline.

## CI

GitHub Actions on `ubuntu-latest` is the authorized non-production environment for database and WebKit gates. It must never run `supabase link`, `supabase db push`, or `supabase gen types --linked`.

- `verify`: format, lint, typecheck, unit tests except P0-5, an assertion that P0-5 is still red, integration tests, and production build.
- `database`: local `supabase start`, `db reset` through migration `0017`, pgTAP, local type generation, a second reset, and pgTAP again.
- `e2e-webkit`: Playwright `mobile-webkit` on a runner that supports WebKit.

## Not yet deployed

- Production Supabase project: pending
- Vercel project: pending
- Domain: pending (`NEXT_PUBLIC_APP_URL`; historical working domain was CanIBringThis.com)
- Published ruleset hash: pending
- Engine version: `0.1.0`
- Vision model: pending
- Regulatory review date: pending

## Rollback

1. Revert the Vercel deployment to the previous successful build.
2. Do not rewrite applied production migrations; add a forward fix.
3. Keep the previous published ruleset effective until a reviewed replacement is published.
