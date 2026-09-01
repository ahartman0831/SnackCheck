# Implementation status

Last updated: 2026-09-01
Baseline detail: [`docs/remediation-baseline.md`](remediation-baseline.md)
Plan: [`docs/SnackCheck-Cursor-Master-Build-Plan.md`](SnackCheck-Cursor-Master-Build-Plan.md)
Prior plan: [`docs/SnackCheck-Cursor-Remediation-Build-Plan-v2.md`](SnackCheck-Cursor-Remediation-Build-Plan-v2.md)
Design system: [`docs/design-system.md`](design-system.md)
Review checklist: [`docs/phase-4c-review-checklist.md`](phase-4c-review-checklist.md)

Allowed states only: `COMPLETE` | `PARTIAL` | `BLOCKED` | `NOT STARTED`.

A phase is not complete because interfaces, placeholder pages, or a published-looking seed exist.

## Current work

Master-plan **Phase 6** is `COMPLETE` and merged by PR [#3](https://github.com/ahartman0831/SnackCheck/pull/3) at `8e60ce1`. Phase 7 is merged by PR [#4](https://github.com/ahartman0831/SnackCheck/pull/4) at `f308364` and remains `PARTIAL` while its remaining phone failure paths and Gemini decision are open. Phase 8 is `COMPLETE` and merged by PR [#5](https://github.com/ahartman0831/SnackCheck/pull/5) at `8efffe3`; required `main` CI is green on run [33333608797](https://github.com/ahartman0831/SnackCheck/actions/runs/33333608797). Phase 10 monitoring and recovery work is merged through PR #7. Phase 11's candidate-ingestion foundation is `COMPLETE` and merged by PR [#8](https://github.com/ahartman0831/SnackCheck/pull/8) at `6ad392b`. Protected review and promotion are `COMPLETE` and merged by PR [#9](https://github.com/ahartman0831/SnackCheck/pull/9) at `d9f7f6c`; required `main` CI is green on run [33402096213](https://github.com/ahartman0831/SnackCheck/actions/runs/33402096213). Public discovery and safe alternatives are merged by PR [#10](https://github.com/ahartman0831/SnackCheck/pull/10) at `a811ec5`; required post-merge CI is green on run [33413174181](https://github.com/ahartman0831/SnackCheck/actions/runs/33413174181). The bounded USDA staging pilot is complete with 489 private candidates and zero public approved rows. Phase 11 remains `PARTIAL` overall while evidence review, regulatory sign-off, candidate promotion, and production launch remain open. Phase 5 remains `PARTIAL`: iPhone Safari passed and Android Chrome was explicitly deferred. Production camera, photo, and AI flags stay off.

The consumer-style public UI refresh is merged by PR [#12](https://github.com/ahartman0831/SnackCheck/pull/12) at `a04d281`; all five PR checks passed. It changed presentation and navigation only. No database, feature flag, catalog, or environment changed.

The deterministic Phase 11 shortlist is merged by PR [#13](https://github.com/ahartman0831/SnackCheck/pull/13) at `c47f0ca`. After all five required checks passed, migration `0031` was applied only to owner-designated staging project `lhnbxjvqllohlbtdncyg`. The exact guarded operation queued 190 candidates for private evidence review. Read-back verified 190 matching audit rows, 273 candidates still in `SCREENED_PASS`, and zero products and formulations. Nothing was approved, promoted, or published; AI and production were not used.

The first ten-candidate evidence pilot is recorded in
[`docs/catalog-evidence-pilot-001.md`](catalog-evidence-pilot-001.md). Two candidates have
strong enough first-party evidence to place before a human reviewer, three require a
same-package barcode and ingredient-panel photo, and five remain on hold. Research did not
promote or publish a product. The current Phase 11 branch also adds one-time email sign-in
for the private reviewer workspace; authentication still grants no access unless the exact
user has an active `admin_members` role. The staging database currently has no active
reviewer member, so all promotion remains blocked until the owner signs in and reviewer-only
membership is deliberately assigned.

The first staging sign-in exposed a cross-browser PKCE failure: a fresh one-time link reached
the correct Vercel callback but could not complete when the request and email click occurred
in different browser contexts. The follow-up replaces clickable email links with a six-digit
email OTP entered on the login page. Authentication and reviewer authorization remain
separate; a verified email still receives no private access without an active
`admin_members` role.

PR #9 adds a reviewer-only catalog queue and evidence detail, guarded queue/reject actions, and one atomic promotion transaction. Promotion requires a current queued candidate, explicit reviewer acknowledgement, confirmed ingredient text, and an independent HTTPS manufacturer source; USDA and Open Food Facts cannot verify their own candidates. Existing GTINs with different formulations create an open conflict instead of replacing the active formulation. Promotion records product, formulation, parsed ingredients, source, any valid deterministic evaluation, canonical links, and an audit entry together. There is no bulk approval control and no AI call. GitHub run [33397852039](https://github.com/ahartman0831/SnackCheck/actions/runs/33397852039) passes `verify`, WebKit, migration `0029`, all pgTAP checks twice across clean resets, generated-type parity, private storage integration, and backup/restore rehearsal. No real dataset was downloaded and no staging or production system was changed.

PR #10 adds the category-first “What can I bring?” experience over a new public discovery projection that begins with the existing strict approved-product function. It exposes only supported package format and safe evidence fields, masks private package-photo details, accepts HTTPS manufacturer evidence links only, and uses neutral category/brand/name ordering with no affiliate input. FAIL and VERIFY product pages may link only to current passing products from the same strict projection. Missing-product and package-change paths feed the existing confirmed ingredient workflow without automatically publishing or replacing catalog records. Controlled fixtures, unit/integration tests, Chrome mobile/desktop browser tests, and Node 22 production build pass locally. GitHub run [33412131484](https://github.com/ahartman0831/SnackCheck/actions/runs/33412131484) passes `verify`, WebKit, migration `0030`, pgTAP twice across clean resets, generated-type parity, private storage integration, and backup/restore rehearsal. No real data was downloaded, no environment was changed, and production flags remain off.

The bounded USDA pilot downloaded and hashed the official April 2026 branded-food
CSV archive, joined a deterministic 10,000-row sample, and completed a local dry
run. The owner explicitly designated Supabase project
`lhnbxjvqllohlbtdncyg` as pre-production/staging. Migrations `0028`–`0030`
were applied there through the SQL editor, and an apply-capped 500-row batch
stored 489 private candidates: 463 `SCREENED_PASS`, 14 `SCREENED_FAIL`, and 12
`SCREENED_VERIFY`. Eleven rows were rejected safely. Independent verification
found 489 unique GTINs and zero public approved rows. No candidate was promoted,
no ruleset was published, and no AI or production system was used. See
[`docs/phase-11-usda-staging-pilot.md`](phase-11-usda-staging-pilot.md).

PR #13 added the deterministic `school-use-v1` shortlist policy and a
service-role-only bounded queue transaction in migration `0031`. The selection
against the real staging pool identified 190 candidates across
38 source categories and 144 brands: 55 snacks, 45 breakfast items, 38
lunchbox items, 10 drinks, and 42 treats. Pantry/preparation categories are
excluded rather than used to pad the target. After merge, the migration and
exact guarded queue operation completed in staging. These rows remain private
and require independent evidence review before any individual promotion. See
[`docs/phase-11-catalog-shortlist.md`](phase-11-catalog-shortlist.md).

**Why not `COMPLETE`:**

- Real Android Chrome camera testing is deferred and unverified.
- Phase 5 still lacks the deferred Android Chrome physical-device pass.

**Host limitations:**

- This Mac still cannot run `supabase db reset` or pgTAP: Docker is not installed.
- Playwright WebKit still cannot be installed here: `Playwright does not support webkit on mac13-arm64`.

**Carried gates (unchanged):**

- **P0-5 is green on the Phase 6 branch** — ownership now uses a signed, expiring, purpose-bound token plus a stored SHA-256 token hash. CI requires the regression to pass.
- **P0-7 remains `BLOCKED`** — unsigned regulatory review. This session did not publish the Arizona ruleset or approve aliases.

Phase 7 has provider-neutral orchestration and server-only Gemini/OpenAI adapters under test, including maximum-call, timeout, one-retry-with-jitter, in-process concurrency, circuit-breaker, database budget, and kill-switch controls. Gemini and OpenAI keys plus staging Supabase credentials are configured only for the Phase 7 Vercel preview branch; Production is explicitly excluded. Verified dated rate cards are recorded in staging and migration `0023`. The staging rows match the dated migration, but `0023` has not been applied through the migration runner. An explicit Vercel-preview-only in-memory limiter supports the authenticated test deployment while production remains fail-closed. Phase 9 is `NOT STARTED`; Phases 10 and 11 are `PARTIAL`. Do not enable production camera, photo, or AI flags.

Phase 7 current branch also connects sanitized photos to bounded transcription, an editable side-by-side confirmation screen, deterministic evaluation, and atomic persistence. Migration `0020` adds provider-attempt records and an AI-specific kill switch/daily counter. Migration `0021` adds the next fail-closed step: a confirmed known-product submission creates an inactive community formulation, ingredient rows, evidence provenance, and—only when a matching published ruleset exists—a durable deterministic evaluation and rule matches. Migration `0022` adds a private per-provider-call usage ledger, versioned model pricing, cached/reasoning token categories, retry/escalation markers, estimated-versus-billed spend fields, and a server-only daily summary. The ledger stores no prompts, ingredient text, images, or secrets. Migrations `0016`–`0022` were applied to the designated staging Supabase project on 2026-08-28; published rulesets remained at zero, and the temporary pgcrypto compatibility wrapper required by staging was removed after the forward fixes applied. Unknown/productless submissions remain conservative `VERIFY` cases.

The licensed ten-image staging corpus now passes the flag-off merge gates. OpenAI `gpt-5.6-luna` with prompt `p7-v1` achieved 100% panel detection, 98.99% normalized transcription accuracy, 88.78% top-level segment F1, and zero false-confidence cases. The run made exactly one call per image, averaged 11.378 seconds, and cost an estimated `$0.02082154`; all ten ledger rows used provider-reported token usage and the verified rate card. The no-panel case failed closed and the degraded soup panel was marked low confidence. Both staging counters ended at ten and both staging kill switches were restored to `true`. See [`docs/phase-7-staging-evaluation.md`](phase-7-staging-evaluation.md). Phase 7 remains `PARTIAL` because real-phone photo-path testing and a Gemini production decision are still outstanding.

The first accepted live staging extraction ran on 2026-08-29 against a synthetic ingredient-label image. Preview controls forced OpenAI first and limited orchestration to one call. `gpt-5.6-luna` with prompt `p7-v1` returned the four visible ingredients exactly, kept the allergen/manufacturer/fixture text out of `ingredientText`, and reached the private confirmation screen without evaluating the text. Provider-reported usage was 1,956 input tokens, 580 output tokens, 324 reasoning tokens, and 2,536 total tokens. The private ledger priced the call from the dated rate card at `$0.001087200`. The daily counter recorded one accepted call, and both staging kill switches were restored to `true` immediately afterward. The prompt was not changed because the tested output met the transcription boundary; changing it would invalidate this evidence. Earlier Gemini Interactions attempts returned no usable output or token usage. The adapter now records a redacted HTTP failure category and supports explicit provider ordering, but Gemini remains unresolved and must not be treated as a proven primary.

The protected preview also completed its first real-phone happy path on a current iPhone running Safari. A real curved supplement package produced an accepted 99%-confidence transcription with no warnings; the user reviewed and confirmed it, and the submission reached `EVALUATED`. The single `gpt-5.6-luna` call took 7.224 seconds and used 3,988 provider-reported tokens at an estimated `$0.001577600` (about 0.16 cents). The deterministic engine correctly returned `VERIFY` with `RULESET_UNAVAILABLE` because staging has no approved published ruleset or independently verified package evidence. Both staging kill switches were restored to `true`. This proves the real-phone secure upload-to-confirmation happy path without weakening fail-closed compliance behavior.

Phase 8 began on draft PR [#5](https://github.com/ahartman0831/SnackCheck/pull/5) with a server-only operations data layer and protected dashboard, submission queue, private review detail, formulation-conflict queue, and health/spend view. The dashboard reports review counts, low-confidence extractions, product conflicts, stale evidence, provider failures, privacy-safe demand signals, recent submissions, and 30-day AI calls/cost/latency. Every admin page checks the current allowlisted role before loading data, and the admin health endpoint requires active membership rather than authentication alone. The private submission review screen puts sanitized evidence, confirmed text, deterministic results, provider cost, and audit history together without exposing raw storage paths or ownership tokens. Migration `0024` provides transactional submission moderation with explicit acknowledgement, stale-edit protection, role rechecks, and same-transaction audit records. Migration `0025` adds the same protections for formulation conflicts: the reviewer compares ingredient text, structured ingredients, verification freshness, and sources side by side, then may select only an already-verified source-backed formulation or reject both. The transaction deactivates superseded formulations, updates the product conflict flag from remaining open conflicts, and records a minimal audit summary. GitHub CI run [33289826722](https://github.com/ahartman0831/SnackCheck/actions/runs/33289826722) passed `verify`, WebKit, and the full local-Supabase job: `0025` applied cleanly, all 80 pgTAP checks passed twice, generated types matched, and private storage integration stayed green. Neither `0024` nor `0025` has been applied to staging or production.

The next Phase 8 slice adds protected ruleset operations in migration `0026`. The admin screen now shows every ruleset version, canonical hash, signed-review status, publication state, and live database blockers. Clone, review, and publication actions use the signed-in administrator's database session, require explicit confirmation and current evidence versions, and write same-transaction audit records. Legacy authenticated access to the older privileged functions is revoked. Review evidence must be an HTTPS document plus lowercase SHA-256, and publication requires a different administrator from the signed reviewer plus typed `PUBLISH` confirmation. AZ-HSA remains unpublished and no ruleset operation has been invoked against staging or production. Local formatting, linting, type checks, 143 web unit tests, 4 non-Docker integration tests, and the 38-route webpack build pass. GitHub CI run [33310772514](https://github.com/ahartman0831/SnackCheck/actions/runs/33310772514) passed `verify`, WebKit, and the full local-Supabase job: `0026` applied cleanly, all 93 pgTAP checks passed twice, generated types matched, and private storage integration stayed green.

The Phase 8 queue/authorization closeout adds validated server-side filters for submissions and open formulation conflicts, corrects the private-review copy, and hides ruleset navigation from reviewers who cannot use it. The unused school-policy placeholder is now an explicit deferral: SnackCheck will not create school-specific regulatory rules or manual local overrides. A later sourced import may show Arizona meal-program participation only with ADE provenance and verification dates, separately from the statewide ingredient determination. At that checkpoint, Phase 8 remained `PARTIAL` because the product create/merge/source workflow was still descriptive. No database migration or external data action was part of that slice.

The product-operations closeout replaces that descriptive Products screen. Migration `0027` adds signed-user transactions that create a product only from an approved, unlinked package submission and merge a confirmed duplicate into a chosen canonical record. Creation requires retained package evidence, confirmed ingredient text, a unique GTIN, explicit reviewer acknowledgement, and a current submission version; it records a package-verified formulation, parsed ingredients, source provenance, any valid stored evaluation, the product link, and an audit entry atomically. Merge requires two current active records, explicit typed confirmation, and no open or ambiguous formulation conflicts. It preserves identifiers, aliases, formulations, evaluations, submissions, and prior redirects, creates a redirect for the retired slug, and deactivates rather than deletes the duplicate. The admin UI now supports product search, active/inactive inspection, evidence review, creation from an approved submission, and guarded duplicate merging. Public visits to a merged slug redirect to the canonical product. Migration `0027` has not been applied outside disposable CI. GitHub CI run [33317318489](https://github.com/ahartman0831/SnackCheck/actions/runs/33317318489) passed `verify`, WebKit, and the complete local-Supabase job: migration `0027` applied cleanly, all 108 pgTAP assertions passed twice across clean resets, generated types matched, and private photo storage integration stayed green. Phase 8 merged as `8efffe3`; post-merge `main` run [33333608797](https://github.com/ahartman0831/SnackCheck/actions/runs/33333608797) passed `verify`, WebKit, and the full database job again.

The first Phase 11 slice is open as PR [#8](https://github.com/ahartman0831/SnackCheck/pull/8). Migration `0028` creates service-role-only import batches and versioned candidate records behind row-level security. Identical source versions are idempotent; newer observations preserve and supersede older candidates, and older observations cannot replace a newer current candidate. The streaming USDA CSV/gzip adapter validates checksummed GTINs, U.S. market, ingredients, and discontinued status, captures CC0 provenance, and runs an ingredient-only deterministic screen against an explicit ruleset snapshot. Dry-run is the default; apply requires an exact confirmation, a bounded row count, and a designated staging project match. Synthetic fixtures cover valid, changed, duplicate, invalid-GTIN, missing-ingredient, non-U.S., and discontinued records. No candidate creates a canonical product or appears in the approved projection. The first CI run proved migration and pgTAP but correctly caught uncommitted generated types; the generated local artifact was committed unchanged. Current run [33393174779](https://github.com/ahartman0831/SnackCheck/actions/runs/33393174779) passes `verify`, WebKit, two clean database resets with pgTAP, generated-type parity, private storage integration, and backup/restore rehearsal. No real dataset was downloaded and no staging or production database was changed.

The first Phase 10 reliability slice adds Next.js server-error instrumentation that emits one structured JSON record for an uncaught request failure. The record is deliberately allowlisted: time, generated request ID, static route, method, safe error code, optional framework digest, environment, and release. It does not serialize thrown messages, stacks, headers, query strings, ingredient text, images, ownership tokens, or secrets. Security headers are centralized and regression-tested; the policy adds transport security, cross-origin opener isolation, DNS-prefetch control, blocked plugins, restricted base URLs/forms/workers, and disabled microphone, geolocation, and browsing-topics access while retaining the self-only camera permission needed for the flag-gated barcode flow. React's development server receives its required debug-only `unsafe-eval`; preview and production policies continue to forbid it. The public shell now uses a native system font stack instead of downloading Google Fonts during every production build, removing a network-dependent build failure without adding a tracking request. The normal WebKit job now builds and starts the production app, so its interaction checks exercise the deployable CSP and runtime instead of Next.js debug behavior; dedicated camera mocks remain in their separate configuration. The Node 22 webpack production build passes with 37 generated pages; the default local Turbopack build proceeds past font resolution and then reaches this Mac's previously documented helper-port restriction. GitHub CI will remain the authoritative default-Turbopack gate. No monitoring vendor receives data in this slice, and CSP nonce work, synthetic alerts, retention cleanup, backup/restore rehearsal, PWA truthfulness, and broader performance budgets remain open.

The second Phase 10 slice is on draft PR [#7](https://github.com/ahartman0831/SnackCheck/pull/7). It adds an optional Sentry destination for the same allowlisted event only. Default SDK integrations, tracing, request capture, user data, breadcrumbs, and exception serialization are disabled; without `SENTRY_DSN`, structured platform logging remains the only sink. Public liveness and bearer-protected readiness endpoints support a synthetic runner that checks the public shell, manual barcode path, privacy page, admin authentication boundary, database access, stopped photo/AI kill switches, and production feature flags without creating data or calling providers. The scheduled GitHub workflow remains honestly inactive until its target variable and matching secret are configured. A dry-run-first retention worker can purge only expired, unlinked terminal submission evidence and requires an exact confirmation phrase for apply mode. CI exercises that cleanup against private local storage and rehearses a real PostgreSQL backup/clear/restore/verify cycle in disposable Supabase. The high-severity Sharp/libvips advisory discovered when dependency auditing became required was resolved by upgrading Sharp to `0.35.4`; the audit is clean. Local Node 22 validation passes format, lint, types, 38 compliance + 4 contract + 163 web unit tests, 4 non-Docker integration tests, the P0-5 regression, the type-generation policy, the privacy-safe six-check synthetic run, and a webpack production build with 37 generated pages. GitHub run [33386360104](https://github.com/ahartman0831/SnackCheck/actions/runs/33386360104) passed `verify`, production-build WebKit, the complete local Supabase reset/108-assertion pgTAP sequence twice, generated-type parity, private storage sanitization and retention cleanup, and the disposable backup/restore rehearsal.

## Master plan phases

| Phase | Name                                                                                                  | Status        |
| ----- | ----------------------------------------------------------------------------------------------------- | ------------- |
| 0     | Baseline and truthful status                                                                          | `COMPLETE`    |
| 1     | Regulatory fail-closed hardening (`0016`, no production fixture fallback, parser warnings block PASS) | `COMPLETE`    |
| 2     | Public product projection / import (`0017`, search status, approved query, fixture isolation)         | `COMPLETE`    |
| 3     | Rebrand to SnackCheck                                                                                 | `COMPLETE`    |
| 4     | Public UI / design system                                                                             | `COMPLETE`    |
| 4C    | Preserve and close the completed remediation                                                          | `COMPLETE`    |
| 5     | Production-quality barcode camera                                                                     | `PARTIAL`     |
| 6     | Secure ingredient-photo submission pipeline                                                           | `COMPLETE`    |
| 7     | Extraction orchestration, confirmation, and persistence                                               | `PARTIAL`     |
| 8     | Admin operations                                                                                      | `COMPLETE`    |
| 9     | Affiliates                                                                                            | `NOT STARTED` |
| 10    | Observability, PWA, CI                                                                                | `PARTIAL`     |
| 11    | Launch catalog and production deploy                                                                  | `PARTIAL`     |

Phase 4C closeout for this session:

- Logical commits from `docs/phase-4c-review-checklist.md` are on `codex/phase-4c-closeout`. They were not pushed to `main`.
- `scripts/generate-db-types.ts` no longer calls `supabase gen types --linked`. A regression test forbids that flag. CI generates types from a local instance only.
- `verify` now runs all unit tests and the explicit green P0-5 regression; Phase 4C's intentional-red assertion was removed in Phase 6.
- `database` starts local Supabase on `ubuntu-latest`, resets through `0018`, runs pgTAP, generates local types, fails if committed types drift, resets again, and runs pgTAP again. It does not link or push.
- `0018` only fixes publication-guard array appends, child-immutability trigger typing, and `search_path`/`digest` qualification so clone works under a locked search_path. It does not publish AZ-HSA.
- `e2e-webkit` installs Playwright WebKit on Ubuntu and runs `mobile-webkit`, then a separate camera-on WebKit job.

Phase 5 for this session:

- Camera UI is behind `FEATURE_BARCODE_CAMERA` / `NEXT_PUBLIC_FEATURE_BARCODE_CAMERA`. Access starts only after a user gesture. Microphone and geolocation are never requested.
- Every decode is normalized and checksum-checked before lookup. Duplicates and concurrent lookups are suppressed. Known GTINs go to the product page; unknown valid GTINs keep the code on `/scan/ingredients`.
- Manual entry stays on the same page when the camera is off, denied, missing, insecure, unsupported, or cancelled.
- Analytics emit attempt, permission failure, invalid decode, lookup outcome, and fallback events without GTIN, image, or IP properties.
- Current iPhone Safari physical testing passed start, rear preview, switch, cancel, decode, manual fallback, and track cleanup. Curved packaging with glare decoded. Android Chrome remains deferred.

Phase 6 closeout:

- Replaced the forgeable prefix cookie with a signed token binding version, submission ID, purpose, issue time, expiry, and random nonce. Verification uses constant-time signature and stored-hash comparison and fails closed when the secret or database record is unavailable.
- Added `0019_submission_pipeline.sql` and pgTAP coverage for private object paths, token/retention metadata, guarded state transitions, evidence matching, storage privacy, a global kill switch, and a daily processing counter. It ran twice against ephemeral local Supabase in CI and is not applied to production.
- Added a server-only image sanitizer that sniffs JPEG/PNG/WebP magic bytes, safely decodes, rejects animated/unsafe input, rotates, resizes, converts to JPEG, strips metadata, re-inspects the output, and records hashes/dimensions/version.
- Added a flag-gated photo chooser with preview, retake, progress, cancellation, privacy copy, and paste fallback. Successful Phase 6 processing stops at `SANITIZED`; no AI provider is called.
- CI uploads a generated image to private local Supabase storage, sanitizes it, proves metadata removal and hash persistence, stores the private derivative, deletes the raw object, and resets the database again. Run [33221197495](https://github.com/ahartman0831/SnackCheck/actions/runs/33221197495) passed.

## Original scaffold inventory

### Repository bootstrap — `PARTIAL`

pnpm monorepo, Next.js 16.3.3, SnackCheck public shell, CI, ADR-0001 exist. This Phase 4C run used Node `v22.22.0`.

### Supabase foundation — `PARTIAL`

`0016`/`0017`/`0018` remain unapplied to production and unexecuted on this host. Ubuntu CI applied them locally, ran pgTAP twice, and regenerated types with `--local`. P0-7 remains a human gate.

### Compliance engine — `PARTIAL`

Unchanged. Search, import, approved browsing, and compliance determinations do not call an LLM.

### Catalog and public pages — `PARTIAL`

Public route architecture is redesigned. Live catalog content still depends on a published ruleset and sourced import.

### Barcode and providers — `PARTIAL`

P0-6 remains green while the camera flag is off. When the flag is on, `/scan/barcode` can start a rear camera after a user gesture and still keeps typed entry. The production flag is not enabled.

### Ingredient pipeline — `PARTIAL`

P0-9 remains green while photo flags are off. P0-5 is green on the Phase 6 branch. Database, storage, sanitizer, and cleanup integration are verified in ephemeral CI; production remains untouched.

### Approved, PWA, sharing — `PARTIAL`

Approved browsing, product share, sitemap, and metadata are redesigned. Offline/PWA work is not production-complete.

### Admin — `PARTIAL`

Unchanged operations scaffold. Admin and confirmation routes are noindexed.

### Launch dataset — `PARTIAL`

The bounded USDA staging pilot imported 489 private candidates from 500 sampled
source rows after a 10,000-row dry run. The public approved projection remains
empty. A deterministic selection has queued 190 strong, category-balanced
school-use candidates for private evidence review; they are not approved.
Public catalog launch still requires independent evidence review, individual
promotion, regulatory review, and a separate production project or a
documented wipe of the staging project.

### Observability and rehearsal — `PARTIAL`

PR #6 established privacy-safe structured logging, security headers, required production-build WebKit, and a network-independent font stack. The current Phase 10 branch adds dormant external error delivery, synthetic liveness/readiness, guarded retention cleanup, a required high-severity dependency audit, and a disposable backup/restore rehearsal. External alert routing, production backup restore, and production Vercel rollback remain human launch gates.

### Production launch — `NOT STARTED`

Not deployed. Domain remains pending via `NEXT_PUBLIC_APP_URL`.

## Command snapshot (Phase 5)

| Command                               | Result                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                   | Passed                                                                                                      |
| `pnpm lint`                           | Passed                                                                                                      |
| `pnpm typecheck`                      | Passed                                                                                                      |
| `pnpm test:types-policy`              | Passed after removing `--linked`                                                                            |
| `pnpm test:unit`                      | Passed — compliance 38, contracts 4, web 80                                                                 |
| `pnpm test:p0-5-open`                 | Passed — P0-5 still fails as required                                                                       |
| `pnpm test:integration`               | Passed — 4 tests                                                                                            |
| `pnpm build`                          | Passed — 36 routes                                                                                          |
| `git diff --check`                    | Clean                                                                                                       |
| Desktop Chromium barcode e2e          | Passed — flag-off manual + camera-on permission paths                                                       |
| `supabase db reset --yes`             | Failed locally — Docker daemon unavailable                                                                  |
| `pnpm exec playwright install webkit` | Failed locally — `Playwright does not support webkit on mac13-arm64`                                        |
| GitHub Actions `verify`               | Passed — [98988031236](https://github.com/ahartman0831/SnackCheck/actions/runs/33212276731/job/98988031236) |
| GitHub Actions `database`             | Passed — [98988031004](https://github.com/ahartman0831/SnackCheck/actions/runs/33212276731/job/98988031004) |
| GitHub Actions `e2e-webkit`           | Passed — [98988031197](https://github.com/ahartman0831/SnackCheck/actions/runs/33212276731/job/98988031197) |

## P0 map after Phase 5

| ID   | Status  | Notes                                                                           |
| ---- | ------- | ------------------------------------------------------------------------------- |
| P0-1 | Green   | Phase 1 — no production fixture ruleset                                         |
| P0-2 | Green   | Phase 1 — parser warnings cannot PASS                                           |
| P0-3 | Green   | Phase 2 — finished public search cards never emit `ingredientStatus: null`      |
| P0-4 | Green   | Phase 2 — production DB miss is not-found, never labeled fixtures               |
| P0-5 | Green   | Phase 6 branch — signed/expiring token plus stored exact token hash             |
| P0-6 | Green   | Phase 5 — camera copy appears only when the barcode camera flag is on           |
| P0-7 | Blocked | Human gate — unsigned regulatory review; do not publish or approve aliases      |
| P0-8 | Green   | Phase 2 — approved catalog uses the live query when Supabase is configured      |
| P0-9 | Green   | Phase 4 — public UI no longer advertises scan/photo while extract is paste-only |

## Remaining operator tasks

1. Complete the deferred Android Chrome camera test before calling Phase 5 `COMPLETE`; iPhone Safari passed.
2. Keep `FEATURE_BARCODE_CAMERA` and `NEXT_PUBLIC_FEATURE_BARCODE_CAMERA` false in production until those tests pass and you choose to enable the camera independently.
3. Do not apply `0016`/`0017`/`0018` to the linked production Supabase project.
4. Sign `docs/regulatory-review.md` before calling publish. Do not approve pending aliases.
5. Keep ingredient-photo flags off in production until Phase 7 is complete and separately approved for rollout.
6. Rehearse the remaining Phase 7 blur, no-panel, outage, correction, and cancel/retake paths on a current phone against the protected preview. The clear/curved-package happy path is proven.
7. Resolve or deliberately replace the unproven Gemini primary-provider path before treating Gemini as production-ready.
