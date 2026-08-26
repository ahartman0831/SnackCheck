# Implementation status

Last updated: 2026-08-26

## Current phase

Phases 0–10 implemented in code. Human regulatory review and production deploy remain gated.

## Phase 0 — Repository bootstrap

Complete. pnpm monorepo, Next.js 16.3.3, public shell, CI, ADR-0001.

Commands: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check`.

## Phase 1 — Supabase foundation

Migrations `0001`–`0015` committed, including Arizona sources, 11 statutory substances, mechanical aliases only enabled, pending aliases disabled, RLS, search RPC, and triggers.

`pnpm db:check-provenance` and `pnpm db:verify-seed` pass.

`supabase db reset` could not run here: Docker daemon is not available (ADR-0002).

Generated Database types are hand-aligned to the schema and replaced by `pnpm db:types` when local Supabase is running.

**Human gate:** `docs/regulatory-review.md` is unsigned. The seeded ruleset is for evaluation, not a signed production publication.

## Phase 2 — Compliance engine

`packages/compliance` implements normalize, parse, match, quality gates, hashes, and `evaluateCompliance`. Isolation test forbids Next/Supabase/OpenAI imports.

`pnpm --filter @snackcheck/compliance test` — 29+ tests including all 11 statutory names, false-positive foods, stale/conflict/OCR precedence, precautionary VERIFY, parent-own-child independence.

CLI: `pnpm check-ingredients "Sugar, Red dye 40"`.

## Phase 3 — Catalog and public pages

Product repository, home/search/product/rules pages, status and context panels. No page calls AI.

Dev catalog is loaded only when `DEV_CATALOG_ENABLED=true` and `NODE_ENV !== production`. Fixtures are labeled `[DEV FIXTURE]`.

## Phase 4 — Barcode and providers

GTIN checksum/expand, `/api/v1/upc/:gtin`, Open Food Facts exact lookup with kill switch, cache, internal-first chain. Invalid GTIN never reaches providers.

## Phase 5 — Ingredient pipeline

Signed upload creation, ownership cookie, extract/confirm routes, paste fallback, deterministic evaluation after confirmation. Production extraction refuses missing rate-limiter/secrets.

Vision provider is behind an interface; mocked/out-of-schema model output is rejected by Zod.

## Phase 6 — Approved, PWA, sharing

`/approved` only lists current PASS from the approved query. Manifest, robots, sitemap, offline page that does not present stale PASS as current. Security headers in `next.config.ts`.

## Phase 7 — Admin

Admin routes and role helper. Magic-link callback. RLS denies anon base-table access. Reviewer cannot enable aliases (database trigger + RLS write policy limited to regulatory/super admin).

## Phase 8 — Launch dataset

Import CSV template and `scripts/import-products.ts` refuse invented rows. No production product seed exists.

**Human gate:** launch-data sample and `docs/regulatory-review.md` still required.

## Phase 9 — Observability and rehearsal

Allowlisted analytics events, HMAC anonymous key, incident and launch runbooks, production extraction circuit breaker. Load tests and restore rehearsal need a deployed environment.

## Phase 10 — Production launch

Not deployed. Domain, Vercel, production Supabase, alerts, and phone smoke tests remain operator work. Rollback steps are in `docs/launch-runbook.md`.

## Known limitations

- Docker/Supabase local reset not run in this environment.
- Camera `@zxing` live stream is scaffolded behind the barcode route; manual entry is the verified path in automated tests.
- Serwist runtime caching is documented; a conservative offline page ships instead of caching private routes.
- No real launch products.
- Regulatory review unsigned.

## Remaining operator tasks

1. Start Docker and run `supabase db reset` twice.
2. Sign `docs/regulatory-review.md`.
3. Import sourced products only.
4. Configure production secrets and Upstash.
5. Deploy CanIBringThis.com and complete the launch checklist.
