# Remediation baseline

Captured: 2026-08-26  
HEAD at start of Phase 0: `cbec8ff` on `main`  
Working tree after Phase 0: plan, failing P0 tests, extracted load/search/token helpers, and this status rewrite. Defects below were **not** fixed.

## Environment

| Item                          | Value                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Node                          | `v20.20.0`                                                                                                                         |
| `package.json` `engines.node` | `>=22`                                                                                                                             |
| pnpm                          | `10.33.0`                                                                                                                          |
| Next.js                       | `16.3.3`                                                                                                                           |
| Result                        | Install/lint/typecheck/build run, with a persistent unsupported-engine warning. Supabase JS also warns that Node 20 is deprecated. |

## Validation commands (exact results)

Commands were run without bypassing pnpm supply-chain / minimum-release-age safeguards.

### `pnpm install`

**PASS** (exit 0). Lockfile already up to date.

Warnings:

- `Unsupported engine: wanted: {"node":">=22"} (current: {"node":"v20.20.0","pnpm":"10.33.0"})`
- Ignored build scripts: `esbuild@0.28.2`, `msw@2.15.0`, `sharp@0.34.5`, `unrs-resolver@1.12.2` (pnpm `approve-builds` not used)

### `pnpm format:check`

**FAIL** (exit 1). Pre-existing, not changed in Phase 0:

```
[warn] apps/web/app/scan/barcode/page.tsx
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
```

### `pnpm lint`

**PASS** (exit 0). `apps/web` ESLint clean. Workspace packages without lint config print a no-op.

### `pnpm typecheck`

**PASS** (exit 0). `packages/contracts`, `packages/db-types`, `packages/compliance`, and `apps/web` `tsc --noEmit` all succeeded.

### `pnpm test`

**FAIL** (exit 1). Expected: new P0 regressions are red. `pnpm -r test` stops at the first package failure (`@snackcheck/compliance`). Web tests were run separately with `pnpm --filter web test`.

| Package                  | Result                                                                      |
| ------------------------ | --------------------------------------------------------------------------- |
| `@snackcheck/contracts`  | 2 passed                                                                    |
| `@snackcheck/compliance` | 30 passed, **2 failed** (P0-2)                                              |
| `web`                    | 4 passed, **9 failed** (P0-1, P0-3, P0-4 miss path, P0-5, P0-6, P0-8, P0-9) |

Passing locks that are already true today:

- GTIN checksum tests
- `isDevCatalogAllowed("production", "true") === false` (P0-4 catalog flag)
- Existing home render test

### `pnpm build`

**PASS** (exit 0). Next.js 16.3.3 Turbopack production build compiled and generated 30 static pages. Node 20 deprecation warnings from `@supabase/supabase-js` during page data collection.

### `pnpm db:check-provenance`

**PASS** (exit 0): `Regulatory provenance checker: required source and substance rows are present.`

### `pnpm db:verify-seed`

**PASS** (exit 0): `Seed verification: development seed is guarded and contains no products.`

`supabase db reset` was not run. Docker is not available in this environment (ADR-0002).

## P0 defects

| ID   | Defect                                                      | Evidence in tree                                                                                                                                   | Phase 0 test                                                                              | Later phase        | Status after Phase 0 |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------ | -------------------- |
| P0-1 | Production can evaluate the hard-coded fixture ruleset      | `decidePublishedRulesetLoad` still returns `use-fixture`; `loadPublishedArizonaRuleset` still calls `arizonaRuleset()`                             | `apps/web/tests/unit/p0-ruleset-load.test.ts` — **FAIL**                                  | Phase 1            | Open                 |
| P0-2 | Parser warnings do not block PASS                           | `parseIngredients` emits `UNBALANCED_PARENTHESES` / `INPUT_TRUNCATED`; `evaluateCompliance` ignores them                                           | `packages/compliance/tests/p0-parser-warnings.test.ts` — **FAIL** (both cases still PASS) | Phase 1            | Open                 |
| P0-3 | Live search cards drop status                               | `mapLiveSearchCard` sets `ingredientStatus: null`                                                                                                  | `apps/web/tests/unit/p0-search-status.test.ts` — **FAIL**                                 | Phase 2            | Open                 |
| P0-4 | Unknown live products can fall through to the dev catalog   | `productMissFallback` returns `dev-catalog` on a miss, including production. `devCatalogEnabled()` itself stays false in production (lock passed). | `apps/web/tests/unit/p0-dev-fixture-isolation.test.ts` — **FAIL** on miss path            | Phase 2            | Open                 |
| P0-5 | Submission “auth” is a forgeable `${id}.${anything}` cookie | `isAuthorizedSubmissionCookie` is still `startsWith(`${id}.`)`                                                                                     | `apps/web/tests/unit/p0-submission-token.test.ts` — **FAIL**                              | Phase 5            | Open                 |
| P0-6 | UI claims camera scanning that is not implemented           | `/scan/barcode` copy vs `BarcodeEntry` only; `FEATURE_BARCODE_CAMERA` unset/false                                                                  | `apps/web/tests/unit/p0-copy.test.ts` — **FAIL**                                          | Phase 5            | Open                 |
| P0-7 | Published seed without signed human review                  | Migration `0015` sets `is_published = true`; `docs/regulatory-review.md` is unsigned                                                               | Human/ops gate — no fake publish fix                                                      | Phase 1 + reviewer | **BLOCKED**          |
| P0-8 | Approved query is empty whenever Supabase is configured     | `approvedCatalogSource({ hasAdminClient: true })` returns `empty`                                                                                  | `apps/web/tests/unit/p0-search-status.test.ts` — **FAIL**                                 | Phase 2            | Open                 |
| P0-9 | Photo extraction is advertised; extract route is paste-only | Home/search/scan CTAs vs `pastedText.split(",")`                                                                                                   | `apps/web/tests/unit/p0-copy.test.ts` — **FAIL**                                          | Phases 5–7         | Open                 |

## Human / ops gates (not inventable in code)

| Gate                               | Evidence                                                                                    | Later phase                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| Unsigned Arizona regulatory review | `docs/regulatory-review.md` checkboxes empty; reviewer/date/hash pending                    | Phase 1 publish             |
| No sourced launch catalog          | Seed verify: no products; import script refuses invented rows                               | Phase 11 / original Phase 8 |
| Upstash not production-complete    | `.env.example` documents required Redis URL/token; local/dev can run without them           | Phase 10                    |
| Sentry not production-complete     | `SENTRY_DSN` optional; no production project wired in this baseline                         | Phase 10                    |
| PWA not production-complete        | Conservative offline page exists; Serwist/runtime caching is not a finished installable PWA | Phase 10                    |
| Node 22 engine vs Node 20 runner   | `engines.node >= 22` vs this machine `v20.20.0`                                             | Operator / CI image         |
| Local Supabase reset               | Docker daemon unavailable                                                                   | Operator                    |

## What Phase 0 changed (and did not)

Changed:

- Placed `docs/SnackCheck-Cursor-Remediation-Build-Plan-v2.md`
- Extracted current (incorrect) load/search/lookup/token decisions into testable modules and wired callers **without** changing fail-open behavior
- Added the failing P0 regressions listed above
- Replaced overstated status copy with `COMPLETE` / `PARTIAL` / `BLOCKED` / `NOT STARTED`

Not started (explicitly out of scope):

- Migration `0016` and fail-closed ruleset loading
- Public product projection / import
- Rebrand, Geist, tab bar, design system
- Camera, uploads, Gemini/OpenAI orchestrator, admin rebuild, affiliates

Stop here. Do not begin Phase 1 until this baseline is approved.

## Phase 4C reconciliation (2026-08-28)

This file remains the Phase 0 snapshot. Later-phase ownership below supersedes the “Later phase” column where they disagree:

- P0-1, P0-2: closed in Phase 1
- P0-3, P0-4, P0-8: closed in Phase 2
- P0-6, P0-9: closed in Phase 4 by honest public copy. Camera and photo extraction were not implemented
- **P0-5 belongs to Phase 6** (secure submission tokens), not Phase 5
- **Phase 5 is camera-only**
- P0-7 remains a human regulatory gate
