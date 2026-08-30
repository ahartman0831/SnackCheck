# SnackCheck Cursor Master Build Plan

**Project:** SnackCheck  
**Prepared:** August 28, 2026  
**Repository:** `https://github.com/ahartman0831/SnackCheck`  
**Purpose:** A self-contained execution brief that another Cursor agent can use to take the existing repository from the completed public-UI remediation through a trustworthy Arizona beta and a polished public V1.

> This is an existing-repository continuation, not a greenfield build. Inspect and preserve what exists. Work one numbered phase at a time, validate it completely, update the status document, and stop for approval at each phase boundary.

## 1. Mission

SnackCheck helps an Arizona parent, teacher, or school operator answer a narrow but important question: does the ingredient list on this packaged food pass the applicable Arizona school-day ingredient check, and what other uncertainty or local policy still needs verification?

The product should feel unusually trustworthy, fast, and calm. It must make uncertainty obvious instead of disguising it. A useful `VERIFY` is better than an unjustified `PASS`. Every public conclusion must be reproducible from a versioned formulation, a versioned ruleset, a deterministic engine version, and stored source evidence.

The permanent architecture principle is:

> **AI extracts. Rules decide. Sources prove. Database remembers.**

### Product promise

**Scan it. Search it. Know before you bring it.**

This promise is only shown for features that actually work. Manual barcode entry is not called scanning. Pasted ingredients are not called photo extraction. Disabled or incomplete features remain behind flags and use honest fallback copy.

## 2. Instructions to the implementing Cursor agent

1. Read this entire document, `apps/web/AGENTS.md`, `docs/implementation-status.md`, `docs/remediation-baseline.md`, `docs/architecture.md`, `docs/design-system.md`, `docs/data-provenance.md`, `docs/regulatory-review.md`, and `docs/launch-runbook.md` before editing.
2. This project uses Next.js 16.3.3 with breaking changes. Before modifying routing, caching, metadata, image handling, proxying, server actions, middleware, service workers, or runtime APIs, read the matching documentation under `apps/web/node_modules/next/dist/docs/`.
3. Inspect the current implementation before adding a new abstraction. Reuse the monorepo, contracts, deterministic compliance engine, database types, repositories, API envelope, feature flags, UI primitives, ruleset lifecycle, import pipeline, and test harness where sound.
4. Preserve unrelated user changes. The current working tree contains the Phase 0–4 remediation and is intentionally far ahead of `HEAD`; do not reset, clean, overwrite, or discard it.
5. Do not commit, push, deploy, publish a ruleset, apply production migrations, import production data, purchase a service, or enable a production feature flag unless the user explicitly authorizes that action.
6. Execute one numbered phase at a time. At the end of each phase, run all required validation, update `docs/implementation-status.md` truthfully, summarize changes and residual risk, then stop for approval.
7. Use only `COMPLETE`, `PARTIAL`, `BLOCKED`, and `NOT STARTED` in implementation status. A placeholder interface is not a completed feature.
8. Add a failing regression test before fixing a security, compliance, data-integrity, or privacy defect.
9. Use forward-only database migrations. Never rewrite a migration already applied to a shared environment.
10. Never bypass package minimum-release-age, lockfile, build-script approval, secret scanning, RLS, rate limiting, or other supply-chain/security controls to make a check pass.
11. No production-only secret may be exposed through a `NEXT_PUBLIC_*` variable, client bundle, log, analytics property, error response, screenshot, fixture, or committed file.
12. Prefer small, reviewable changes inside the current phase. Do not opportunistically begin a later phase.

## 3. Absolute non-negotiables

### Compliance and regulation

- An LLM must never produce or influence `PASS`, `FAIL`, `VERIFY`, applicability, local-policy status, approved-list eligibility, search ranking, or evidence freshness.
- Only `packages/compliance` may calculate compliance. It remains a pure TypeScript package and must not import Next.js, Supabase, provider SDKs, analytics, UI code, or environment variables.
- Production must fail closed when a ruleset is missing, unpublished, expired, internally inconsistent, or hash-invalid.
- Parser warnings, incomplete ingredients, low confidence, stale evidence, active formulation conflicts, unresolved product candidates, community-only evidence, external-database-only evidence, or unconfirmed extraction must never produce a current public `PASS`.
- Published rulesets are immutable snapshots. Corrections create a reviewed successor; they do not alter history.
- A qualified human must sign `docs/regulatory-review.md` before an Arizona ruleset or alias corpus is published.
- Pending or invented synonyms must not match. Only sourced, effective, reviewed, enabled aliases participate.
- Ingredient result, statutory applicability, and local-school policy remain separate determinations.

### Product evidence

- Never invent products, UPCs, GTINs, ingredients, images, prices, retailers, verification dates, school participation, manufacturer claims, sources, or review status.
- Open Food Facts and other external databases are discovery inputs, not verified truth.
- Every public formulation, product image, school claim, enabled regulatory alias, and approved-list inclusion must point to stored provenance.
- A product can be imported without being approved. Approved-list inclusion requires a current published ruleset, a stored classroom `PASS`, verified/package-verified evidence, current freshness, and no conflict.

### Privacy and security

- Browsers, uploaded files, provider responses, model output, URLs, metadata, and client-supplied identifiers are untrusted.
- Anonymous submission ownership uses a cryptographically signed, expiring, constant-time-verified token. A string prefix or request ID is not authorization.
- Raw uploads are private, short-lived, and never exposed to public URLs. Providers receive only sanitized derivatives.
- Validate file signatures, decoded type, dimensions, pixel count, animation/frame count, and byte size. Do not trust an extension or `Content-Type` header.
- Strip EXIF and other metadata by decoding and re-encoding. Record the sanitizer result and content hash.
- Service-role Supabase access stays in `server-only` modules. Authentication is not authorization; every admin mutation enforces a role.
- Rate-limit by a privacy-preserving key with endpoint-specific and global budgets. Never store raw IP addresses.

### Commercial integrity

- Affiliate availability, commission, merchant, or price never affects compliance, verification, approved-list membership, or search order.
- Affiliate and sponsored surfaces must be visibly disclosed and independently disableable.
- No retailer CTA appears until the affiliate phase is complete and approved.

## 4. Current repository truth

The current working tree implements remediation Phases 0–4 on top of the original `cbec8ff` commit. At the August 28 review it contained 62 modified files and 66 untracked paths. Preserve it before starting new features.

### Implemented and worth preserving

- pnpm monorepo with `apps/web`, `packages/compliance`, `packages/contracts`, `packages/db-types`, `supabase`, scripts, and tests.
- Deterministic Arizona compliance engine with fail-closed ruleset handling, quality gates, source-aware matching, reproducible hashes, and separate determinations.
- Migrations `0001`–`0017`, pgTAP coverage through `0017`, generated database types, a strict sourced catalog importer, public product projection, search, approved eligibility, and fixture isolation.
- SnackCheck brand, responsive public shell, system/light/dark themes, design tokens and primitives, honest feature-aware copy, accessible status cards, homepage command center, search, product detail, approved browsing, Arizona rules, manual barcode entry, pasted ingredient checking, legal/support pages, SEO, offline page, and visual fixtures.
- Admin authentication/role helper, ruleset lifecycle APIs, provider abstractions, rate-limiter abstraction, analytics contracts, storage bucket schema, and feature flags.

### Verified during the August 28 review

- `pnpm format:check`: pass.
- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- Compliance package: 38 tests pass.
- Contracts package: 3 tests pass.
- Web tests: 55 pass; one intentional P0 security regression fails.
- Integration tests: 2 pass.
- Production build: passes through the Next.js webpack fallback and generates 36 routes.
- Default Turbopack build is blocked on this host because its CSS worker cannot bind an internal port; do not misclassify that host restriction as an application defect.

### Known blockers and defects

- `apps/web/lib/submissions/submission-token.ts` accepts any `${submissionId}.*` cookie. This is P0-5 and must be fixed in Phase 6 before any photo submission is enabled.
- The web suite reports two asynchronous React scheduler errors after `p4-public-pages.test.tsx`; fix the test lifecycle before treating the suite as clean.
- The local runtime is Node 20 while the repository and Supabase client require/recommend Node 22.
- Migrations `0016` and `0017` and their pgTAP tests have not been executed against a real PostgreSQL/Supabase environment.
- Regulatory review is unsigned. The ruleset must remain unpublished and the approved catalog empty in production.
- Barcode capture, secure image processing, extraction orchestration, operational admin, affiliates, production observability, launch catalog, and deployment are not complete.
- Admin pages are mostly descriptive placeholders.
- Existing vision code is a scaffold, not an approved extraction pipeline.

## 5. Target users and core journeys

### Parent or caregiver

1. Search a familiar product, enter/scan its barcode, or paste/photograph its ingredients.
2. Receive a clear `PASS`, `FAIL`, or `VERIFY` with visible evidence age and explanation.
3. Understand the difference between classroom distribution, food for their own child, and school-specific rules.
4. Share the reproducible result without overstating certainty.

### Teacher or classroom organizer

1. Browse products that pass the Arizona ingredient check.
2. Filter by useful package categories without implying allergy safety.
3. Verify the exact package/formulation before distribution.
4. See that local policy, allergens, and campus rules may still apply.

### Reviewer or regulatory administrator

1. Triage submissions, extraction failures, stale evidence, and formulation conflicts.
2. Compare source image, extracted text, user-confirmed text, parsed ingredients, and deterministic result.
3. Review products and formulations without silently overwriting verified history.
4. Draft, review, hash, and publish immutable rulesets with role separation and audit logging.

### Product operator

1. See provider health, extraction cost, error rate, unknown GTINs, zero-result searches, queue age, stale products, and incidents.
2. Disable unsafe providers/features quickly.
3. Roll back application deployments while retaining regulatory/database history.

## 6. Product quality bar

SnackCheck should be excellent because it removes doubt, not because it adds decorative complexity.

- Primary actions are obvious on a phone and have at least 44×44px targets.
- Every loading, permission, empty, offline, timeout, stale, conflict, missing-data, unavailable-ruleset, provider-failure, and rate-limit state offers an honest next action.
- Status never relies on color alone; it includes icon, text, explanation, and evidence state.
- Camera and upload flows work with keyboard, screen readers, reduced motion, high zoom, and manual fallbacks.
- The UI never flashes a `PASS` before the final deterministic evaluation arrives.
- Search feels immediate, cancels stale requests, preserves query state, and distinguishes no results from unavailable data.
- Product pages show identity, package/formulation evidence, evaluation date, ruleset version/hash, freshness, matched ingredients, scope, and local-policy disclaimer.
- Technical metadata is available without overwhelming the primary answer.
- Copy uses plain language and never implies government endorsement, medical/allergy safety, guaranteed school acceptance, or legal advice.
- Dark and light themes maintain WCAG AA contrast. Reduced motion disables scanner animation and nonessential transitions.
- Mobile Safari and Chrome are launch gates, not optional follow-up work.

## 7. Delivery phases

## Phase 4C — Preserve and close the completed remediation

**Goal:** turn the large uncommitted Phase 0–4 working tree into a reviewable, reproducible baseline without changing product scope.

### Work

1. Inventory every modified/untracked file and group it by Phase 0, 1, 2, 3, or 4 responsibility.
2. Review for accidental secrets, generated junk, duplicate exports, stale historical branding, hidden fixture leakage, and unrelated edits.
3. Fix the two React teardown errors by awaiting user/render work and cleaning timers/listeners; do not suppress unhandled errors.
4. Standardize developer/CI execution on Node 22. Document the selected version manager only if the repository already uses or the user approves one.
5. Run the full validation suite on Node 22.
6. Run desktop Chrome, mobile Chrome, and mobile WebKit E2E with accessibility checks and retain purposeful screenshots.
7. In an authorized non-production Supabase environment, apply migrations through `0017`, run all pgTAP tests, regenerate types, reset a second time, and confirm idempotent seed/import behavior.
8. Reconcile documentation: P0-5 belongs to Phase 6; Phase 5 is camera-only. Update status, baseline cross-references, and runbooks accordingly.
9. Prepare small logical commits or a review checklist, but commit only when authorized.

### Acceptance

- No unknown file is discarded.
- All format, lint, type, unit, integration, database, build, E2E, and accessibility gates pass or have an exact environment blocker.
- `git diff --check` is clean except intentional Markdown hard-break whitespace already accepted by formatting policy.
- The implementation-status document matches observed behavior.
- The user approves Phase 4 before Phase 5 starts.

## Phase 5 — Production-quality barcode camera

**Goal:** add a fast, accessible camera barcode flow without touching ingredient-photo security or AI.

### Work

1. Read the current Next.js client-component and browser permission documentation plus `@zxing/browser` APIs installed in the repository.
2. Build a client-only camera component behind `FEATURE_BARCODE_CAMERA` / `NEXT_PUBLIC_FEATURE_BARCODE_CAMERA`.
3. Request the environment-facing camera only after a user gesture. Never request microphone or geolocation.
4. Prefer the rear camera, enumerate/switch cameras only after permission, and release every media track on success, cancel, navigation, backgrounding, and unmount.
5. Decode supported UPC-A, UPC-E, EAN-8, EAN-13, and GTIN-compatible formats. Pass all results through the existing GTIN normalizer/checksum validator.
6. Debounce duplicate frames and permit one in-flight lookup. Provide haptic/audio feedback only when supported, respectful, and user-controlled.
7. Route a known product to its product page. Route an unknown valid GTIN to the manual ingredient flow with the normalized code preserved.
8. Handle permission denied, no camera, insecure context, decode timeout, unsupported device, invalid checksum, offline state, lookup failure, and provider rate limit.
9. Keep manual entry on the same page and make it usable without camera permission.
10. Add telemetry for attempt, permission outcome, valid decode, invalid code, lookup outcome, and fallback—without image/frame data or raw IP.
11. Update public copy/navigation only when the flag is enabled.

### Tests

- Unit-test state transitions, duplicate suppression, cleanup, GTIN routing, and feature-flag copy.
- Mock `MediaDevices` and ZXing at the browser boundary.
- E2E permission granted/denied/unavailable paths plus manual fallback.
- Manual phone verification on current iOS Safari and Android Chrome.

### Acceptance

- No media track remains active after leaving the page.
- Manual entry always works.
- Camera-off builds contain no false camera claim.
- Invalid or duplicated decodes cannot trigger repeated external lookups.
- All Phase 4 gates remain green.

## Phase 6 — Secure ingredient-photo submission pipeline

**Goal:** accept anonymous package photos safely, prove submission ownership, sanitize images, and create a private evidence trail. Do not call an AI provider yet.

### Database and contracts

1. Add forward migration `0018_submission_pipeline.sql` (use the next available number if another migration now exists).
2. Extend submissions/evidence as needed for token version, token hash or nonce, ownership expiry, state transitions, raw/sanitized object paths, hashes, sanitizer version, dimensions, media type, retention, attempt counters, and safe failure codes.
3. Add database constraints/triggers so illegal state transitions or mismatched evidence cannot be silently written.
4. Add private storage policies and cleanup jobs. Anonymous clients never receive service-role access or public object URLs.
5. Regenerate `packages/db-types` only from the applied local schema.

### Ownership

1. Replace prefix authorization with a random capability token signed using `SUBMISSION_TOKEN_SECRET` or a server-stored hashed token.
2. Bind token version, submission ID, purpose, issued time, and expiry. Verify exact structure and signature in constant time.
3. Use `HttpOnly`, `Secure` in production, `SameSite=Lax` or stricter, narrow path where practical, and short expiry.
4. Rotate/revoke tokens on completion or suspicious reuse. Never log them.
5. Protect creation, upload completion, extraction request, confirmation, status, and cancellation routes consistently.

### Image pipeline

1. Create a submission and a short-lived signed upload target only when the photo feature is enabled and production prerequisites are configured.
2. Enforce upload byte limit at storage and application layers.
3. Server-side: download raw object, verify storage path ownership, sniff magic bytes, decode safely, reject malformed/unsupported/animated/decompression-bomb content, correct orientation, resize to configured dimensions, convert to an approved format, strip metadata, and compute SHA-256.
4. Store the sanitized derivative privately with a non-guessable path. Providers in Phase 7 receive only this derivative.
5. Delete or expire raw content quickly. Retain sanitized content only according to a documented review/consent policy.
6. Do not claim EXIF stripping until tests inspect output metadata and prove it.
7. Make retries idempotent and prevent concurrent workers from processing the same submission twice.
8. Add global daily spend/volume kill switches in addition to per-client limits.

### UI

- Add camera/file chooser, preview, retake, upload progress, cancel, privacy explanation, failure recovery, and paste-instead fallback.
- Never evaluate from an image in this phase. Successful sanitization advances only to an extraction-ready state.

### Acceptance

- The forged-cookie regression is green, with tampered, expired, wrong-ID, malformed, and replay cases covered.
- No model/provider call exists in the pipeline.
- Raw and sanitized objects are private and correctly deleted/retained.
- Metadata removal, dimension/byte enforcement, hash persistence, MIME sniffing, RLS, rate limits, and illegal transitions have integration tests.
- Photo feature remains off in production until Phase 7 completes.

## Phase 7 — Extraction orchestration, confirmation, and persistence

**Goal:** turn a sanitized ingredient-panel image into structured candidate text, require human confirmation, then evaluate deterministically and persist reproducible evidence.

### Provider architecture

1. Create `apps/web/lib/ai/` with provider-neutral contracts, orchestrator, provider adapters, prompt/version registry, error taxonomy, structured logging, and test fixtures.
2. Use the repository’s `IngredientExtractionSchema` as the minimum shared contract. Tighten constraints if needed without allowing providers to return compliance fields.
3. Configure model IDs through server-only environment variables and verify currently available provider/model names during implementation. Do not hard-code assumptions from this plan.
4. Intended strategy: Gemini low-cost primary, stronger Gemini escalation for failed/low-confidence output, then OpenAI fallback. Maximum three provider calls per sanitized image.
5. Provider SDKs must not import `packages/compliance` and prompts must explicitly request transcription/structure only.

### Orchestration rules

- Parse JSON safely and validate with Zod.
- Reject prose-wrapped, truncated, oversized, schema-invalid, or compliance-bearing output.
- Escalate on provider error, missing panel, low overall/span confidence, severe warnings, or structurally implausible text.
- Detect and record disagreements between providers; do not silently choose a favorable output.
- Cache only by sanitized image hash + provider + model + prompt version + schema version.
- Use timeouts, bounded retries with jitter, circuit breakers, concurrency limits, daily budget, and kill switches.
- Store provider, model, prompt version, latency, token/usage metadata when available, confidence, warnings, and safe failure codes. Never log image bytes or secret-bearing payloads.

### Confirmation and evaluation

1. Present image and extracted text together with confidence/warnings and clear editing controls.
2. Require explicit confirmation. The user can correct text, retake, paste instead, or cancel.
3. Re-parse the confirmed text using deterministic code.
4. Create or attach a versioned formulation/evidence record with `COMMUNITY_SUBMITTED` status. Community confirmation alone does not make a formulation verified or approved-list eligible.
5. Load a published valid ruleset and call only `packages/compliance` for the determination.
6. Persist evaluation, matches, formulation hash, ruleset hash, engine version, context, timestamps, and quality flags atomically.
7. Idempotent resubmission returns the same stored result for the same confirmed formulation/ruleset/context combination.
8. Low-confidence, warning-bearing, conflicting, unavailable-ruleset, or incomplete cases return `VERIFY` with a helpful next action.

### Evaluation set

- Build a licensed/internal test corpus covering clear panels, glare, blur, curved packaging, vertical text, multiple languages, nested ingredients, precautionary statements, very long lists, no ingredient panel, adversarial text, and corrupted files.
- Keep real images out of Git unless redistribution rights are documented. Store metadata and expected structured output separately.
- Measure panel detection, exact/normalized text quality, ingredient segmentation, warning recall, provider escalation rate, cost, latency, and false-confidence rate. Never score AI on PASS/FAIL.

### Acceptance

- No unconfirmed extraction can be evaluated or published.
- No provider can return a compliance status through types, prompt contract, or persistence path.
- Maximum-call, timeout, fallback, budget, conflict, and outage behaviors are tested.
- End-to-end happy, correction, low-confidence, no-panel, outage, offline, and ruleset-unavailable paths work on phones.
- Features remain kill-switchable without breaking paste-only evaluation.

## Phase 8 — Real admin and moderation operations

**Goal:** replace descriptive admin placeholders with safe workflows that a small operating team can use daily.

### Work queues

- Dashboard: pending submissions, low-confidence extraction, conflicts, stale evidence, unknown GTINs, zero-result searches, failed providers, queue age, and recent ruleset actions.
- Submissions: sanitized image, extraction, confirmed text, parsed ingredients, product candidates, provenance, result, and state history.
- Products: search, create from sourced evidence, merge with redirects, identifiers, aliases, images/attribution, activation, and duplicate detection.
- Formulations: version comparison, sources, ingredients, evidence age, activate/deactivate/stale/reject, and explicit conflict workflow.
- Rulesets: clone published to draft, attach sources, review aliases, show hash diff, validate, record review, and publish immutable snapshot.
- School participation: later import source-backed Arizona meal-program participation records with source and verification dates. Do not create school-specific regulatory rules, local overrides, or unsourced “participating” badges; the statewide determination remains separate.
- Analytics/health: privacy-safe product metrics and provider/queue health, not vanity dashboards.

### Authorization and audit

- `REVIEWER`: read/review submissions, products, formulations, conflicts; cannot publish rules or manage members.
- `REGULATORY_ADMIN`: ruleset/source/alias review and publish; cannot silently bypass source requirements.
- `SUPER_ADMIN`: membership and exceptional operations with audit.
- Every mutation rechecks current role server-side and writes before/after JSON, actor, request ID, entity, and timestamp.
- Require explicit confirmation for publish, merge, reject, revoke, and destructive/irreversible transitions.

### Acceptance

- An operator can move a valid submission from review through product/formulation/evaluation persistence without SQL or service-role console work.
- Role-denial and audit tests cover every mutation.
- Concurrent edits surface a conflict; they do not silently overwrite.
- Admin pages are noindexed and unauthorized data never reaches the client.

## Phase 9 — Optional retailer and affiliate layer

**Goal:** add useful, transparent purchase links without compromising trust. This phase may be deferred until after the Arizona beta and must not block it.

### Work

1. Add forward migration for merchants, retailer products, URLs, price observations, availability, attribution, affiliate programs, click events, and disclosure version.
2. Keep retailer identity and offers separate from products/formulations/evaluations.
3. Ingest only sourced retailer data. Prices are timestamped observations, never guarantees.
4. Add links only to product pages with clear disclosure and an external-link warning where appropriate.
5. Rank offers by a documented neutral rule such as availability/freshness plus user-selected preference—not commission.
6. Use redirect/click endpoints that validate destinations and record privacy-safe events.
7. Add global and merchant-specific kill switches.

### Acceptance

- Disabling affiliates changes no compliance result, approved list, search order, evidence status, or product existence.
- Disclosure is visible before/with commercial CTAs.
- Broken/expired offers disappear safely.
- Legal/affiliate review is signed before enablement.

## Phase 10 — Reliability, observability, PWA truthfulness, and release engineering

**Goal:** make the beta operable, measurable, recoverable, and honest under failure.

### Observability

- Structured server logs with request ID, route, safe error code, duration, ruleset/engine version when relevant, provider/model metadata, and no sensitive content.
- Error monitoring with source maps and environment/release tags.
- Metrics/alerts for wrong-result reports, `VERIFY` rate changes, API error/latency, search zero results, unknown GTINs, provider failures/cost, extraction volume, rate limits, queue age, storage growth, stale evidence, ruleset expiry, and backup status.
- Synthetic checks for home, search, rules endpoint, manual evaluation, admin auth boundary, and feature kill switches.

### Security and privacy

- Review CSP and remove avoidable `unsafe-inline` allowances where feasible with the current Next.js setup.
- Add dependency audit policy, secret scanning, security headers tests, log redaction tests, RLS/authorization regression suite, upload abuse tests, and retention cleanup verification.
- Complete privacy, terms, disclosure, data retention, deletion/contact, AI provider, analytics, and affiliate disclosures based on actual behavior.

### PWA/offline

- Advertise install/offline only if the service worker, update behavior, icons, manifest, cache invalidation, and offline routes are tested.
- Never show a cached `PASS` as current. Cached results display evaluation date, evidence freshness, ruleset version, and an offline/stale warning.
- Do not cache private submissions, admin data, signed URLs, secrets, or user-confirmed ingredient content beyond the explicit design.

### CI/release

- Node 22 frozen install; format; lint; types; unit; integration; database reset/pgTAP; generated-type diff; production build; E2E Chrome/WebKit; accessibility; secret scan; dependency audit; migration lint; and bundle/performance reporting.
- Use preview environments with non-production Supabase and flags off by default.
- Document database backup/restore drill, Vercel rollback, forward migration response, ruleset successor publication, provider kill switches, and incident ownership.

### Performance targets

- Set measured budgets after collecting representative mobile data. At minimum track LCP, INP, CLS, first-load JS, API p95, search latency, barcode-to-result time, upload/sanitize time, extraction latency, and admin queue load.
- Prefer server components and progressive enhancement. Lazy-load camera, upload, provider, and admin-only code.
- Self-host fonts if production builds should not depend on Google Fonts availability.

### Acceptance

- Alerts and dashboards are tested with synthetic failures.
- Backup restore and rollback are rehearsed.
- Offline behavior cannot misrepresent freshness.
- CI is required and green on Node 22.
- Incident and launch runbooks name owners and exact actions.

## Phase 11 — Sourced launch catalog and production release

**Goal:** launch a credible Arizona beta, then progressively enable full V1 features.

### Regulatory gate

1. Complete every item in `docs/regulatory-review.md` with qualified reviewer, date, source URLs/archives, eleven statutory substances, enabled alias review, effective dates, public explanation copy, and resulting ruleset hash.
2. Approve only mechanical or sourced aliases. Pending aliases stay disabled.
3. Publish through the application’s reviewed lifecycle; never change the migration seed into a production-published shortcut.

### Catalog gate

1. Source at least 50 current Arizona-relevant packaged products for beta; expand toward 100–300 for V1.
2. Use manufacturer pages and package photographs where possible. Record license/attribution for images.
3. Dry-run, review, and then import through the idempotent importer.
4. Verify a representative sample manually against stored evidence and deterministic output.
5. Resolve duplicates/conflicts. Do not force uncertain products into the approved list.
6. Confirm every approved product satisfies the existing strict eligibility query.

### Production setup

- Authorized Supabase project with migrations, RLS, storage, backups, retention, and least-privilege secrets.
- Vercel project, confirmed domain, environment separation, Node 22, flags off by default, monitoring release, rate limiting, provider budgets, and rollback target.
- Verify robots, sitemap, canonical URLs, metadata, social card, support channel, legal pages, accessibility, security headers, and analytics consent/behavior.
- Conduct real-device rehearsals on weak network, denied permissions, offline mode, provider outage, ruleset unavailable, and rollback.

### Staged rollout

1. Internal/admin-only smoke test.
2. Manual barcode + paste-only beta with camera/photo flags off if those phases are not fully accepted.
3. Small invited Arizona beta; monitor errors, `VERIFY`, support, and wrong-result reports.
4. Enable barcode camera independently.
5. Enable ingredient photo/extraction to a small percentage only after Phases 6–7 acceptance and budgets are confirmed.
6. Expand catalog and traffic gradually. Affiliates remain independently gated.

### Launch acceptance

- Signed published ruleset with reproducible hash.
- Minimum sourced catalog achieved with no fabricated rows.
- No open P0/P1 defect, no unexplained test error, and no failing required CI gate.
- Production is fail-closed under missing DB/rules/provider conditions.
- Monitoring, on-call contacts, backup, restore, rollback, incident, privacy, and support paths are proven.
- Go-live approval is recorded by product owner, regulatory reviewer, and technical operator.

## 8. Cross-cutting API and data conventions

- Keep the existing API envelope and stable safe error codes.
- Validate all route params, query strings, JSON, form data, provider payloads, and model output with shared or route-local Zod schemas.
- Use request IDs end-to-end without treating them as secrets or authorization.
- Mutation endpoints are idempotent where retries are plausible.
- Avoid leaking record existence across authorization boundaries.
- Database operations that create a formulation/evaluation/evidence graph are transactional.
- Store timestamps in UTC; render local/contextual dates clearly.
- Store and compare canonical SHA-256 hashes for rulesets, formulation text, and images.
- Preserve historical evaluations when a ruleset or formulation changes; create successors.
- Regenerate DB types after applied schema changes and fail CI on drift.
- Production fixture use is a test failure. Dev fixtures require explicit `DEV_CATALOG_ENABLED=true` and remain impossible in production.

## 9. Test strategy

### Unit

- Compliance normalization, parsing, matching, quality gates, hash parity, unavailable/expired rules, and explanation invariants.
- GTIN normalization/checksum, search projection, approved eligibility, provider mapping, token signing, upload validation, orchestrator policy, feature flags, and admin authorization.
- UI state machines and accessible copy for every public state.

### Database/pgTAP

- Migration reset, constraints, immutable publication, source requirements, RLS, admin roles, storage policies, state transitions, import idempotency, approved-list query, audit log, cleanup, and forbidden direct anonymous access.

### Integration

- Route-to-repository behavior with real local Supabase where meaningful.
- Upload/sanitize/storage lifecycle.
- Extraction orchestration with recorded fake providers, never paid live calls in routine CI.
- Confirmation-to-formulation-to-evaluation atomic persistence.
- Admin mutations and audit.

### E2E

- Home/search/product/approved/rules/manual barcode/manual ingredients.
- Camera permission paths and cleanup.
- Photo upload, progress, retake, extraction, correction, confirmation, and result.
- Offline/error/stale/conflict/unavailable/rate-limit states.
- Admin auth and role boundaries.
- Mobile Chrome, mobile WebKit, desktop Chrome, keyboard, reduced motion, dark mode, 200% zoom, and automated accessibility.

### Security/abuse

- Token tampering/replay/expiry, IDOR, CSRF assumptions, rate-limit evasion, oversized/malformed/polyglot/decompression-bomb images, signed URL expiry, path manipulation, provider prompt injection, schema bombs, log injection, unsafe redirect, RLS bypass, and secret exposure.

### Manual review

- Regulatory source/hash comparison.
- Package evidence against parsed ingredients.
- Representative PASS/FAIL/VERIFY explanation review.
- Phone camera usability in real lighting and packaging conditions.
- Screen-reader and cognitive clarity review.

## 10. Definition of done

### Honest Arizona beta

- Reviewed, signed, published immutable Arizona ruleset.
- Production-backed search, products, manual barcode, pasted ingredients, approved browsing, evidence, freshness, and reproducible results.
- At least 50 current sourced products.
- Secure admin minimum operations, monitoring, rate limits, privacy/terms/support, backups, rollback, and phone testing.
- Camera and photo features may remain disabled without misleading copy.

### Full public V1

- Live barcode camera with robust fallbacks.
- Secure private photo upload and proven sanitization.
- Bounded provider orchestration, structured extraction, human confirmation, persistence, and deterministic evaluation.
- Conflict/staleness/moderation workflows and functional admin.
- 100–300 sourced products as operations allow.
- Production observability, incident response, and tested PWA behavior if advertised.
- Optional affiliates only after independent integrity and legal gates.

### The product is not done when

- a feature has only a page, interface, migration, or disabled scaffold;
- tests pass only with fixtures that production could accidentally use;
- a `PASS` cannot be reconstructed from stored source, formulation hash, ruleset hash, and engine version;
- a model result bypasses confirmation or deterministic evaluation;
- a human regulatory, legal, privacy, or go-live gate is still unsigned;
- mobile Safari, database tests, backups, monitoring, or rollback are unproven.

## 11. Phase completion report template

At the end of every phase, respond with:

1. **Outcome:** `COMPLETE`, `PARTIAL`, or `BLOCKED`, with one-sentence reason.
2. **Implemented:** grouped by user-visible behavior, server/API, database, and operations.
3. **Files/migrations:** notable additions and changes.
4. **Security/compliance:** invariants affected and how they were tested.
5. **Validation:** every command, exit result, test counts, E2E browsers/devices, and environmental limitations.
6. **Data actions:** whether any database, storage, provider, import, deploy, or external system was changed.
7. **Residual risk:** known defects, unrun gates, assumptions, and human approvals.
8. **Status update:** exact change made to `docs/implementation-status.md`.
9. **Next phase:** what it would do, without starting it.
10. **Approval request:** stop and wait.

## 12. First execution instruction

Begin with **Phase 4C only**.

Do not start camera work. First preserve and inventory the current working tree, fix the two asynchronous test errors, validate on Node 22, run the database migrations/pgTAP in an authorized non-production environment if available, run the full browser/accessibility suite, reconcile the status documents, and present the Phase 4 closeout report for approval.

If Docker, Supabase access, Node 22, WebKit, or another required environment is unavailable, complete every safe local check, document the exact blocker and command output, and stop. Do not weaken the gate or claim completion.
