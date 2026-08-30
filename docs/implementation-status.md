# Implementation status

Last updated: 2026-08-29
Baseline detail: [`docs/remediation-baseline.md`](remediation-baseline.md)
Plan: [`docs/SnackCheck-Cursor-Master-Build-Plan.md`](SnackCheck-Cursor-Master-Build-Plan.md)
Prior plan: [`docs/SnackCheck-Cursor-Remediation-Build-Plan-v2.md`](SnackCheck-Cursor-Remediation-Build-Plan-v2.md)
Design system: [`docs/design-system.md`](design-system.md)
Review checklist: [`docs/phase-4c-review-checklist.md`](phase-4c-review-checklist.md)

Allowed states only: `COMPLETE` | `PARTIAL` | `BLOCKED` | `NOT STARTED`.

A phase is not complete because interfaces, placeholder pages, or a published-looking seed exist.

## Current work

Master-plan **Phase 6** is `COMPLETE` and merged by PR [#3](https://github.com/ahartman0831/SnackCheck/pull/3) at `8e60ce1`. Phase 7 is merged by PR [#4](https://github.com/ahartman0831/SnackCheck/pull/4) at `f308364` and remains `PARTIAL` while its remaining phone failure paths and Gemini decision are open. Phase 8 has started on `codex/phase-8-admin-operations`. Phase 5 remains `PARTIAL`: iPhone Safari passed and Android Chrome was explicitly deferred. Production camera, photo, and AI flags stay off.

**Why not `COMPLETE`:**

- Real Android Chrome camera testing is deferred and unverified.
- Phase 5 still lacks the deferred Android Chrome physical-device pass.

**Host limitations:**

- This Mac still cannot run `supabase db reset` or pgTAP: Docker is not installed.
- Playwright WebKit still cannot be installed here: `Playwright does not support webkit on mac13-arm64`.

**Carried gates (unchanged):**

- **P0-5 is green on the Phase 6 branch** — ownership now uses a signed, expiring, purpose-bound token plus a stored SHA-256 token hash. CI requires the regression to pass.
- **P0-7 remains `BLOCKED`** — unsigned regulatory review. This session did not publish the Arizona ruleset or approve aliases.

Phase 7 has provider-neutral orchestration and server-only Gemini/OpenAI adapters under test, including maximum-call, timeout, one-retry-with-jitter, in-process concurrency, circuit-breaker, database budget, and kill-switch controls. Gemini and OpenAI keys plus staging Supabase credentials are configured only for the Phase 7 Vercel preview branch; Production is explicitly excluded. Verified dated rate cards are recorded in staging and migration `0023`. The staging rows match the dated migration, but `0023` has not been applied through the migration runner. An explicit Vercel-preview-only in-memory limiter supports the authenticated test deployment while production remains fail-closed. Phases 8–11 are `NOT STARTED`. Do not enable production camera, photo, or AI flags.

Phase 7 current branch also connects sanitized photos to bounded transcription, an editable side-by-side confirmation screen, deterministic evaluation, and atomic persistence. Migration `0020` adds provider-attempt records and an AI-specific kill switch/daily counter. Migration `0021` adds the next fail-closed step: a confirmed known-product submission creates an inactive community formulation, ingredient rows, evidence provenance, and—only when a matching published ruleset exists—a durable deterministic evaluation and rule matches. Migration `0022` adds a private per-provider-call usage ledger, versioned model pricing, cached/reasoning token categories, retry/escalation markers, estimated-versus-billed spend fields, and a server-only daily summary. The ledger stores no prompts, ingredient text, images, or secrets. Migrations `0016`–`0022` were applied to the designated staging Supabase project on 2026-08-28; published rulesets remained at zero, and the temporary pgcrypto compatibility wrapper required by staging was removed after the forward fixes applied. Unknown/productless submissions remain conservative `VERIFY` cases.

The licensed ten-image staging corpus now passes the flag-off merge gates. OpenAI `gpt-5.6-luna` with prompt `p7-v1` achieved 100% panel detection, 98.99% normalized transcription accuracy, 88.78% top-level segment F1, and zero false-confidence cases. The run made exactly one call per image, averaged 11.378 seconds, and cost an estimated `$0.02082154`; all ten ledger rows used provider-reported token usage and the verified rate card. The no-panel case failed closed and the degraded soup panel was marked low confidence. Both staging counters ended at ten and both staging kill switches were restored to `true`. See [`docs/phase-7-staging-evaluation.md`](phase-7-staging-evaluation.md). Phase 7 remains `PARTIAL` because real-phone photo-path testing and a Gemini production decision are still outstanding.

The first accepted live staging extraction ran on 2026-08-29 against a synthetic ingredient-label image. Preview controls forced OpenAI first and limited orchestration to one call. `gpt-5.6-luna` with prompt `p7-v1` returned the four visible ingredients exactly, kept the allergen/manufacturer/fixture text out of `ingredientText`, and reached the private confirmation screen without evaluating the text. Provider-reported usage was 1,956 input tokens, 580 output tokens, 324 reasoning tokens, and 2,536 total tokens. The private ledger priced the call from the dated rate card at `$0.001087200`. The daily counter recorded one accepted call, and both staging kill switches were restored to `true` immediately afterward. The prompt was not changed because the tested output met the transcription boundary; changing it would invalidate this evidence. Earlier Gemini Interactions attempts returned no usable output or token usage. The adapter now records a redacted HTTP failure category and supports explicit provider ordering, but Gemini remains unresolved and must not be treated as a proven primary.

The protected preview also completed its first real-phone happy path on a current iPhone running Safari. A real curved supplement package produced an accepted 99%-confidence transcription with no warnings; the user reviewed and confirmed it, and the submission reached `EVALUATED`. The single `gpt-5.6-luna` call took 7.224 seconds and used 3,988 provider-reported tokens at an estimated `$0.001577600` (about 0.16 cents). The deterministic engine correctly returned `VERIFY` with `RULESET_UNAVAILABLE` because staging has no approved published ruleset or independently verified package evidence. Both staging kill switches were restored to `true`. This proves the real-phone secure upload-to-confirmation happy path without weakening fail-closed compliance behavior.

Phase 8 is `PARTIAL` on draft PR [#5](https://github.com/ahartman0831/SnackCheck/pull/5), with a server-only operations data layer and protected dashboard, submission queue, private review detail, formulation-conflict queue, and health/spend view. The dashboard reports review counts, low-confidence extractions, product conflicts, stale evidence, provider failures, privacy-safe demand signals, recent submissions, and 30-day AI calls/cost/latency. Every admin page checks the current allowlisted role before loading data, and the admin health endpoint requires active membership rather than authentication alone. The private submission review screen puts sanitized evidence, confirmed text, deterministic results, provider cost, and audit history together without exposing raw storage paths or ownership tokens. Migration `0024` provides transactional submission moderation with explicit acknowledgement, stale-edit protection, role rechecks, and same-transaction audit records. Migration `0025` adds the same protections for formulation conflicts: the reviewer compares ingredient text, structured ingredients, verification freshness, and sources side by side, then may select only an already-verified source-backed formulation or reject both. The transaction deactivates superseded formulations, updates the product conflict flag from remaining open conflicts, and records a minimal audit summary. Local formatting, linting, type checks, 133 web unit tests, 4 non-Docker integration tests, and a 38-route webpack production build pass. GitHub CI validation for `0025` is pending. Neither `0024` nor `0025` has been applied to staging or production. Ruleset operations, school-policy operations, and richer queue filters remain outstanding.

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
| 8     | Admin operations                                                                                      | `PARTIAL`     |
| 9     | Affiliates                                                                                            | `NOT STARTED` |
| 10    | Observability, PWA, CI                                                                                | `NOT STARTED` |
| 11    | Launch catalog and production deploy                                                                  | `NOT STARTED` |

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

### Launch dataset — `BLOCKED`

No fabricated production catalog was imported.

### Observability and rehearsal — `PARTIAL`

CI `verify`, `database`, and `e2e-webkit` are green on Phase 6 draft PR [#3](https://github.com/ahartman0831/SnackCheck/pull/3) run [33221197495](https://github.com/ahartman0831/SnackCheck/actions/runs/33221197495). The database job includes the real private-storage pipeline integration test.

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
