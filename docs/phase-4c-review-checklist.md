# Phase 4C review checklist

Prepared: 2026-08-28  
HEAD at inventory: `cbec8ff` on `main`  
Purpose: preserve the Phase 0–4 working tree as a reviewable baseline. Local commits were authorized on 2026-08-28. Do not push.

## Proposed commit grouping

Authorized for local commits only. Do not push.

1. **Phase 0 — Baseline**  
   Remediation plan v2, baseline doc, failing P0 tests, extracted load/search/token helpers.
2. **Phase 1 — Regulatory fail-closed**  
   Migration `0016`, unavailable ruleset, parser warnings, ruleset lifecycle APIs and tests.
3. **Phase 2 — Public product projection**  
   Migration `0017`, catalog contracts, search/approved RPCs, importer, eligibility tests.
4. **Phase 3 — Rebrand and design system**  
   Tokens, primitives, shell, brand assets, `/dev/ui`, design-system doc.
5. **Phase 4 — Public UI**  
   Homepage, search, product, approved, rules, barcode, ingredients, legal/support, SEO, visual tests.
6. **Phase 4C — Closeout**  
   Test teardown, Node 22 documentation, dark-mode accent contrast, status reconciliation, Playwright base-URL override, this checklist.

## Complete inventory at 2026-08-28 closeout

Paths are grouped by primary phase responsibility. Shared files appear once under the latest phase that materially changed them.

### Phase 0

- `docs/SnackCheck-Cursor-Remediation-Build-Plan-v2.md`
- `docs/remediation-baseline.md`
- `apps/web/tests/unit/p0-copy.test.ts`
- `apps/web/tests/unit/p0-dev-fixture-isolation.test.ts`
- `apps/web/tests/unit/p0-ruleset-load.test.ts`
- `apps/web/tests/unit/p0-search-status.test.ts`
- `apps/web/tests/unit/p0-submission-token.test.ts`
- `packages/compliance/tests/p0-parser-warnings.test.ts`
- `apps/web/lib/products/lookup-policy.ts`
- `apps/web/lib/submissions/` (token helper; P0-5 still red)

### Phase 1

- `supabase/migrations/0016_regulatory_hardening.sql`
- `supabase/tests/0002_regulatory_hardening.sql`
- `packages/compliance/src/fixtures/unavailable-ruleset.ts`
- `packages/compliance/tests/p1-unavailable.test.ts`
- `apps/web/app/api/admin/rulesets/`
- `apps/web/lib/rules/ruleset-admin.ts`
- `apps/web/lib/rules/ruleset-lifecycle.ts`
- `apps/web/lib/rules/ruleset-load-policy.ts`
- `apps/web/tests/unit/p1-ruleset-lifecycle.test.ts`
- `apps/web/lib/rules/arizona.ts`
- `apps/web/app/api/v1/rules/arizona/route.ts`
- `apps/web/app/api/v1/evaluations/route.ts`
- `packages/compliance/src/hash-ruleset.ts`
- `packages/compliance/src/index.ts`
- `packages/compliance/src/parse-ingredients.ts`
- `packages/compliance/src/quality-gates.ts`
- `packages/compliance/src/test-helpers.ts`
- `packages/compliance/tests/hash-parity.test.ts`
- `packages/contracts/src/compliance.ts`

### Phase 2

- `supabase/migrations/0017_public_product_projection.sql`
- `supabase/tests/0003_public_product_projection.sql`
- `packages/contracts/src/catalog.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/tests/contracts.test.ts`
- `apps/web/lib/products/approved-eligibility.ts`
- `apps/web/lib/products/import-catalog.ts`
- `apps/web/lib/products/public-search-card.ts`
- `apps/web/lib/products/search-query.ts`
- `apps/web/lib/products/dev-catalog.ts`
- `apps/web/lib/products/repository.ts`
- `apps/web/lib/products/types.ts`
- `apps/web/app/api/v1/search/route.ts`
- `apps/web/app/api/v1/products/approved/route.ts`
- `apps/web/tests/unit/p2-approved-eligibility.test.ts`
- `apps/web/tests/unit/p2-import-catalog.test.ts`
- `apps/web/tests/unit/p2-search-api.test.ts`
- `apps/web/tests/unit/p2-search-query.test.ts`
- `apps/web/tests/unit/p2-search-route.test.ts`
- `apps/web/tests/integration/p2-approved-api.test.ts`
- `scripts/import-products.ts`
- `scripts/generate-db-types.ts`
- `packages/db-types/src/database.types.ts`
- `docs/data-import-runbook.md`

### Phase 3

- `apps/web/components/ui/`
- `apps/web/components/brand/`
- `apps/web/components/shell/`
- `apps/web/components/theme/`
- `apps/web/lib/brand.ts`
- `apps/web/lib/theme.ts`
- `apps/web/lib/shell.ts`
- `apps/web/app/dev/`
- `apps/web/app/opengraph-image.tsx`
- `apps/web/public/icons/`
- `apps/web/public/icon.svg`
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/app/manifest.ts`
- `apps/web/components/site-header.tsx`
- `apps/web/components/site-footer.tsx`
- `apps/web/components/compliance/status-card.tsx`
- `scripts/render-brand-icons.ts`
- `docs/design-system.md`
- `apps/web/tests/unit/p3-rebrand.test.ts`
- `apps/web/tests/unit/p3-status-badge.test.tsx`
- `apps/web/tests/unit/p3-theme-shell.test.ts`

### Phase 4

- `apps/web/components/public/`
- `apps/web/lib/features.ts`
- `apps/web/lib/public-copy.ts`
- `apps/web/lib/seo.ts`
- `apps/web/app/page.tsx`
- `apps/web/app/search/page.tsx`
- `apps/web/app/product/[slug]/page.tsx`
- `apps/web/app/approved/page.tsx`
- `apps/web/app/approved/[category]/page.tsx`
- `apps/web/app/rules/arizona/page.tsx`
- `apps/web/app/scan/barcode/page.tsx`
- `apps/web/app/scan/ingredients/page.tsx`
- `apps/web/app/scan/confirm/[submissionId]/page.tsx`
- `apps/web/app/privacy/page.tsx`
- `apps/web/app/terms/page.tsx`
- `apps/web/app/disclosure/`
- `apps/web/app/support/`
- `apps/web/app/error.tsx`
- `apps/web/app/not-found.tsx`
- `apps/web/app/offline/page.tsx`
- `apps/web/app/robots.ts`
- `apps/web/app/sitemap.ts`
- `apps/web/app/admin/layout.tsx`
- `apps/web/tests/unit/p4-approved.test.tsx`
- `apps/web/tests/unit/p4-barcode.test.tsx`
- `apps/web/tests/unit/p4-ingredients.test.tsx`
- `apps/web/tests/unit/p4-public-copy.test.ts`
- `apps/web/tests/unit/p4-public-pages.test.tsx`
- `apps/web/tests/unit/p4-search.test.tsx`
- `apps/web/tests/unit/p4-seo.test.ts`
- `apps/web/tests/unit/home.test.tsx`
- `tests/e2e/public-routes.spec.ts`
- `tests/e2e/shell-visual.spec.ts`
- `tests/e2e/home.spec.ts`
- `tests/e2e/artifacts/`

### Shared / bootstrap (touched across phases)

- `.env.example` (placeholders only; no secrets)
- `README.md`
- `package.json`
- `pnpm-lock.yaml`
- `apps/web/package.json`
- `apps/web/next.config.ts`
- `apps/web/lib/env.ts`
- `apps/web/app/api/v1/submissions/[id]/confirm/route.ts`
- `apps/web/app/api/v1/submissions/[id]/extract/route.ts`
- `supabase/tests/0001_ruleset_and_rls.sql`
- `docs/architecture.md`
- `docs/regulatory-review.md`
- `apps/web/vitest.integration.config.ts`

### Phase 4C (this closeout)

- `docs/SnackCheck-Cursor-Master-Build-Plan.md`
- `docs/phase-4c-review-checklist.md`
- `docs/implementation-status.md`
- `docs/launch-runbook.md`
- `docs/design-system.md` (`--on-accent`)
- `.gitignore` (`exports/*.zip`)
- `apps/web/vitest.setup.ts` (await cleanup; do not swallow errors)
- `apps/web/tests/unit/p4-search.test.tsx` (flush live-search timers)
- `apps/web/tests/unit/p4c-contrast.test.ts`
- `apps/web/playwright.config.ts` (`PLAYWRIGHT_BASE_URL` override; Chrome channel only outside CI)
- `.github/workflows/ci.yml` (local Supabase/pgTAP and Ubuntu WebKit jobs)
- `scripts/generate-db-types.ts` (`--local` only)
- `scripts/generate-db-types-policy.test.cjs`
- `scripts/assert-p0-5-open.mjs`
- `apps/web/app/globals.css` (`--on-accent` for filled actions)
- `apps/web/components/ui/button.tsx` and other filled accent controls
- `apps/web/app/globals.css` (`--on-accent`)
- `apps/web/components/ui/button.tsx`
- `apps/web/tests/unit/p4c-contrast.test.ts`

### Local artifacts (do not commit)

- `exports/SnackCheck-audit-all-2026-08-28.zip`
- `exports/SnackCheck-audit-2026-08-26.zip`
- `.env.local` and `apps/web/.env.local` (gitignored secrets)
- `apps/web/.next/`
- `node_modules/`

## Secret and junk review

- No `.env.local` contents are tracked. Do not commit them.
- `.env.example` contains empty `SUPABASE_SERVICE_ROLE_KEY=` only.
- Historical “Can I Bring This?” remains only in labeled docs and `LEGACY_PRODUCT_NAME`.
- Labeled development fixtures stay behind `DEV_CATALOG_ENABLED` and are impossible in production.
- Playwright artifacts under `tests/e2e/artifacts/` are purposeful visual fixtures, not product images.
- Audit zip files are ignored by `exports/*.zip`. The zip files themselves were not deleted.

## Human gates that remain

- Do not publish AZ-HSA or approve aliases.
- Do not apply `0016`/`0017` to the linked production Supabase project.
- Do not import a fabricated catalog.
- Do not start Phase 5 until this closeout is approved.
- Do not commit until authorized.
