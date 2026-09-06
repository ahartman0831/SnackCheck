# SnackCheck Finish-Line Build Plan

**Recorded:** September 6, 2026  
**Objective:** Take the existing SnackCheck repository from its current staging state to a trustworthy public Arizona beta, then complete the optional commercial and expansion layers without weakening product integrity.

## Authority and use

This is the canonical completion roadmap for the remainder of the SnackCheck build. Future work should use this document to choose and sequence the next slice.

This document does not replace the technical, security, privacy, compliance, or testing requirements in [`SnackCheck-Cursor-Master-Build-Plan.md`](SnackCheck-Cursor-Master-Build-Plan.md). It converts the unfinished portions of that plan into one ordered path to launch. If the documents appear to conflict, use the stricter safety requirement and record the discrepancy before proceeding.

At the beginning of a future implementation session, read:

1. `apps/web/AGENTS.md`
2. This finish-line plan
3. `docs/implementation-status.md`
4. `docs/SnackCheck-Cursor-Master-Build-Plan.md`
5. The phase-specific documents for the active slice

Work one milestone or explicitly bounded sub-slice at a time. At each boundary, validate, update `implementation-status.md`, report data or external actions, identify residual risk, and stop for owner approval before merging, deploying, publishing, or enabling a production feature.

## Definition of the finish line

The primary finish line is a trustworthy public **Arizona beta**, not a nationwide service, native mobile app, affiliate business, or exhaustive catalog.

The Arizona beta is ready only when:

- a reviewed Arizona ruleset is signed and published through the protected lifecycle;
- at least 50 current, independently evidenced products are available, with 100–150 preferred for a strong beta;
- users can answer both “Can I bring this?” and “What can I bring?”;
- uncertain, stale, conflicting, or unsupported evidence fails closed to `VERIFY`;
- no AI model can determine or influence compliance;
- production infrastructure is separate from staging and has working backup, monitoring, retention, email, support, and rollback paths;
- required CI is green and no P0/P1 defect remains open;
- real-device and degraded-condition launch checks pass; and
- the product owner records explicit go-live approval.

The permanent architecture principle remains:

> **AI extracts. Rules decide. Sources prove. Database remembers.**

## Current baseline

- Phases 0–4C, 6, and 8 are complete.
- Phase 5 is partial: physical iPhone Safari testing passed; Android Chrome is deferred.
- Phase 7 is partial: OpenAI extraction, confirmation, deterministic evaluation, and spend tracking work; remaining phone failure paths and the Gemini production decision are open.
- Phase 10 is partial: CI, privacy-safe monitoring, synthetic checks, retention, and disposable recovery rehearsal exist; final production operations remain open.
- Phase 11 is partial: public discovery, protected promotion, USDA ingestion, a 489-row staging pilot, and shortlist automation exist; no candidate has been publicly approved.
- The current Supabase project is owner-designated staging/non-production.
- Production camera, photo, AI, and affiliate features remain off.
- The public approved catalog remains empty until evidence, ruleset, and promotion gates pass.
- PR #19 merged at `ee1b1c5` after migration `0032` and the guarded 489-record assessment were applied only to staging. Independent read-back confirmed 95 `AUTO_EVIDENCE`, 6 `HUMAN_EXCEPTION`, 388 `DEPRIORITIZED`, 489 matching audit entries, and zero products or formulations. Post-merge `main` CI is green on run 34041127695.

## Milestone 1 — Complete classroom relevance routing

Status: `COMPLETE`

### Work

1. Treat the external audit as quality input without changing the approved operating model.
2. Resolve launch-relevant hardening items, including explicit production denial, bounded full-corpus processing, row locking, stable ordering, run identity, old-queue reconciliation, unassessed visibility, test gaps, and the 87/95 documentation typo.
3. Preserve the intended rule that classroom relevance determines whether a source record deserves further work. An irrelevant product does not require human ingredient review merely because its source data is uncertain.
4. Run the complete local and GitHub validation suite.
5. Apply migration `0032` to the owner-designated staging project before merging the dependent UI.
6. Save the 489 audited assessments with the exact guarded staging operation.
7. Read back and independently confirm 95 automatic-evidence, 6 human-exception, and 388 deprioritized records, including complete audit coverage.
8. Confirm pantry, bulk, preparation, food-service, discontinued, and otherwise unsuitable products do not appear in the routine queue.
9. Merge PR #19 only after the staging read-back and required CI are green.

### Acceptance

- The system, not the owner, decides which imported candidates deserve evidence work.
- No product is created, approved, promoted, or published by relevance assessment.
- The admin queue remains usable across the documented migration-first deployment.

## Milestone 2 — Automated independent evidence collection

Status: `PARTIAL` on `codex/phase-11-evidence-collection`. The first local slice
defines the bounded collector and source policy with no live requests or data writes.
Migration `0033` adds private, service-only run manifests and immutable evidence dossiers;
isolated database CI and generated-type parity pass on run 34048327317. It remains
unapplied to staging pending the controlled-pilot gate.

### Work

Build a bounded collector for the 95 promising candidates. For each candidate, attempt to locate and preserve:

- an official manufacturer product page;
- a current ingredient statement;
- legitimate package imagery where license and provenance permit;
- exact GTIN, flavor, size, and package identity;
- source URL, retrieval time, evidence date, hash, license, and attribution; and
- Open Food Facts or other permitted secondary evidence when useful.

Reject search snippets, unverifiable retailer copy, mismatched flavors or sizes, discontinued pages, unclear product identities, and generated or unsourced ingredient claims. Apply host allowlists/denylists, request budgets, rate limits, timeouts, robots/terms review, bounded concurrency, and resumable/idempotent run records.

### Acceptance

- Every attempted candidate has an evidence dossier or a specific, audited reason trustworthy evidence was not found.
- Evidence collection cannot publish or approve a product.
- Costs, request counts, provenance, and failures are measurable.

## Milestone 3 — AI-assisted evidence extraction and comparison

### Work

Use AI only to read and compare evidence:

- transcribe ingredient panels and manufacturer statements;
- compare manufacturer, package, USDA, and OFF text;
- identify missing text, disagreements, and likely formulation changes;
- assess whether evidence describes the same GTIN/flavor/size/package; and
- route ambiguity to `HUMAN_EXCEPTION`.

Validate model output structurally. Preserve provider, model, prompt version, source, tokens, cost, latency, confidence, retry/escalation state, and discrepancy result without storing unnecessary personal data or secrets.

### Acceptance

- AI output never sets `PASS`, `FAIL`, `VERIFY`, catalog eligibility, evidence freshness, or search rank.
- Confirmed ingredient text is evaluated only by `packages/compliance`.
- Provider failure, disagreement, or low confidence stops automatic progression safely.

## Milestone 4 — Guarded high-confidence promotion

### Work

Implement a promotion worker that initially operates in recommendation-only mode. Automatic promotion may later be enabled only when all required gates pass:

- high classroom relevance;
- exact product/GTIN/formulation identity;
- current independent manufacturer or package evidence;
- sufficiently confident extraction;
- source agreement or resolved discrepancy;
- deterministic `PASS` under the reviewed ruleset;
- fresh evidence;
- no open conflict;
- complete provenance and audit records; and
- sampling and rollback controls.

Begin with representative human quality sampling. Add quarantine, duplicate/conflict handling, idempotency, per-run caps, a kill switch, and a maximum error threshold.

### Acceptance

- Strong candidates can progress without individual owner review.
- Uncertain candidates cannot progress automatically.
- A failed batch can be stopped and reversed without deleting historical evidence.

## Milestone 5 — Build the launch catalog

### Work

Reach at least 50 independently evidenced Arizona-relevant products; prefer 100–150 for launch and expand toward 100–300 for V1.

Use, in order:

1. the 95 promising USDA-derived candidates;
2. Open Food Facts bulk/export data under its applicable terms and attribution;
3. manufacturer websites and package evidence;
4. targeted discovery of common classroom snacks; and
5. post-launch missing-product demand.

Balance the initial catalog across portable snacks, chips, crackers, pretzels, bars, popcorn, fruit snacks, treats, drinks, breakfast items, and lunchbox products. Do not pad category targets with unsuitable or weakly evidenced products.

### Acceptance

- “What can I bring?” returns useful, varied choices.
- Every public product passes the strict approved-product projection.
- Evidence dates and package identity are visible and truthful.
- A manually checked sample agrees with stored evidence and deterministic results.

## Milestone 6 — Complete Arizona regulatory sign-off

### Work

A qualified reviewer verifies the exact Arizona ruleset against the controlling statute, 2025 legislation, ADE guidance, effective date, eleven restricted substances, enabled aliases, explanation copy, and launch sample. Record reviewer, date, sources/archives, and exact ruleset hash.

A separately authorized administrator then publishes that immutable reviewed version through the protected application workflow. Corrections create a successor; they never rewrite published history.

### Acceptance

- `docs/regulatory-review.md` is complete and signed.
- Only sourced/mechanical aliases are enabled.
- The reviewed hash exactly matches the published hash.
- Staging and production publication actions are separately authorized and audited.

## Milestone 7 — Close launch-critical technical and operational gaps

### Work

- Complete physical Android Chrome camera testing.
- Rehearse blur, no-panel, correction, denied permission, cancel/retake, weak network, provider outage, rate limit, and ruleset-unavailable paths on current phones.
- Decide whether Gemini is a proven backup, deliberately disabled, or replaced; Gemini need not block beta if OpenAI has a safe configured path.
- Configure production-grade SMTP for administrator authentication.
- Complete monitoring destinations and test alerts with synthetic failures.
- Rehearse a real Vercel rollback and production-style database restore.
- Finalize privacy, terms, AI-provider, analytics, retention/deletion, support, and—only if enabled—affiliate disclosures.
- Verify accessibility, security headers, abuse controls, rate limits, and representative mobile performance.
- Either complete truthful PWA/offline behavior or do not advertise it.

### Acceptance

- Required device and degraded-condition checks pass.
- Failures are visible, understandable, privacy-safe, and recoverable.
- No P0/P1 defect or unexplained required-test failure remains.

## Milestone 8 — Create the production environment

### Work

1. Create a Supabase project separate from staging.
2. Apply reviewed migrations in order and verify generated types, RLS, functions, private storage, backups, and retention.
3. Configure least-privilege production secrets, administrator accounts, SMTP, monitoring, support contact, rate limits, AI budgets, and kill switches.
4. Configure the final Vercel production environment and custom domain.
5. Start with all optional feature flags off.
6. Import only the verified launch catalog and publish only the signed ruleset.
7. Verify robots, sitemap, canonical URLs, metadata, social cards, legal pages, analytics behavior, backup, restore, and rollback.

### Acceptance

- Test data and staging secrets are absent from production.
- Missing database, ruleset, or provider dependencies fail closed.
- A known-good previous deployment and restorable database backup exist.
- Production changes are explicitly approved and recorded.

## Milestone 9 — Controlled Arizona beta

### Rollout

1. Internal administrator smoke test.
2. Invite-only beta using search, manual barcode, and pasted ingredients.
3. Monitor errors, `VERIFY` rates, zero-result searches, unknown GTINs, support requests, and wrong-result reports.
4. Enable the barcode camera independently after its final acceptance.
5. Enable ingredient photo/extraction for a small cohort only after Phase 7 acceptance and budget confirmation.
6. Increase access gradually while expanding high-demand catalog coverage.
7. Record final product-owner go-live approval.

### Acceptance

- Users can report an incorrect result, changed package, or missing product.
- Evidence dates and the reasons for `PASS`, `FAIL`, and `VERIFY` are understandable.
- Monitoring, support, rollback, and kill switches are proven under live beta conditions.
- Both core questions work: “Can I bring this?” and “What can I bring?”

## Deferred until after the Arizona beta

The following opportunities must not delay the beta unless the owner explicitly reprioritizes them:

- Amazon or other retailer affiliate links;
- live retailer price and availability tracking;
- native Apple App Store or Google Play applications;
- nationwide/state-specific regulatory expansion;
- school-specific policy administration;
- a catalog containing thousands of products;
- advanced personalization and ordinary-user accounts;
- full offline/PWA capability;
- production Gemini support; and
- marketing automation and large-scale acquisition campaigns.

Affiliate work remains the original Phase 9 and is independently gated. Commission may never influence compliance, catalog eligibility, evidence, alternatives, or search ranking.

## Execution order

The default order is:

1. Finish and merge PR #19.
2. Build evidence collection.
3. Build AI evidence comparison.
4. Run the controlled 95-candidate pilot.
5. Enable guarded promotion after sampling.
6. Reach the minimum sourced catalog.
7. Complete regulatory review and publish the exact reviewed ruleset.
8. Close launch-critical device, email, monitoring, recovery, legal, and privacy gaps.
9. Create and verify production infrastructure.
10. Run the invited beta.
11. Open the public Arizona beta.
12. Add commercial and expansion features independently after launch.

Do not skip a gate because a later milestone is available. A later milestone may be developed behind flags when it does not create external changes or weaken an earlier gate, but it cannot be accepted or enabled out of order.

## Progress-recording protocol

After every approved slice:

- update `docs/implementation-status.md` with only `COMPLETE`, `PARTIAL`, `BLOCKED`, or `NOT STARTED`;
- identify the finish-line milestone and acceptance criteria affected;
- list code, migration, environment, data, provider, and deployment actions separately;
- record validation commands and CI links;
- record counts, hashes, costs, and external identifiers when applicable;
- distinguish staging from production explicitly;
- preserve unresolved risks and human gates; and
- state the next recommended bounded slice.

No implementation artifact, successful demo, green unit test, or populated staging table by itself constitutes launch completion.
