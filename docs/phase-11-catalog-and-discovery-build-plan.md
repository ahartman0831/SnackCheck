# Phase 11 catalog and discovery build plan

**Status:** `COMPLETE` for PR #8 candidate ingestion foundation; open and unmerged
**Owner approval received 2026-08-31 for PR #8 only**
**Prepared:** 2026-08-31  
**Planning branch:** `codex/phase-11-catalog-foundation`; implementation begins only after approval

## 1. Outcome

Build a trustworthy, maintainable product catalog that can answer both:

1. **Can I bring this?** — evaluate a specific barcode, search result, pasted ingredient list, or confirmed package photo.
2. **What can I bring?** — browse only current, source-backed products that pass the same published Arizona ingredient screen.

The catalog must scale beyond manual entry without treating a bulk database, community record, web page, or AI output as automatically verified. Imported records are candidates. Only reviewed, current formulations with source evidence and a deterministic `PASS` under the current published ruleset may appear in the public passing-products projection.

## 2. Product and legal wording

SnackCheck is not an Arizona product-approval authority. A.R.S. § 15-242.01 defines an ultraprocessed food for this section as a food or beverage containing one or more of eleven named ingredients. The law governs covered school service, sale, and distribution; it expressly preserves a parent or guardian's ability to provide food to their own student. Arizona Department of Education guidance says shared classroom snacks, celebrations, prizes, and similar distribution are within the school compliance responsibility.

Public language must therefore use:

- **“Passes the current Arizona 11-ingredient screen”** rather than “Arizona-approved.”
- **“What I can bring”** as the friendly navigation label, with the narrower determination explained on the page.
- A clear separation among the statutory ingredient result, applicability, allergies, nutrition, package traits, and any independently sourced school information.

The repository's regulatory gate is a one-time documented source, scope, alias, and public-copy review. It is not a requirement that an attorney review every product. Before public ruleset publication, obtain targeted review from counsel or a school-nutrition compliance professional familiar with Arizona requirements, record the reviewer/date/sources, and preserve the resulting ruleset hash.

Authoritative sources:

- [A.R.S. § 15-242.01](https://www.azleg.gov/ars/15/00242-01.htm)
- [ADE HNS 05-2026 compliance memorandum](https://www.azed.gov/sites/default/files/2026/05/Arizona%20Healthy%20Schools%20Act.pdf)
- [ADE administrator resource and family/classroom FAQ](https://www.azed.gov/sites/default/files/2026/01/The%20Basics%20of%20the%20Arizona%20Healthy%20Schools%20Act%20Resource%20for%20School%20Administrators.pdf)

## 3. Source strategy

### 3.1 Primary bulk source: USDA FoodData Central

Use the USDA Global Branded Food Products Database as the first bulk candidate source because it provides GTIN/UPC, brand, description, ingredient text, category, market country, modification/publication dates, and discontinued status. USDA publishes FoodData Central under CC0.

- [USDA downloadable datasets](https://fdc.nal.usda.gov/download-datasets/)
- [USDA field descriptions](https://fdc.nal.usda.gov/portal-data/external/dataDictionary)
- [USDA API and CC0 terms](https://fdc.nal.usda.gov/api-guide/)

Initial policy:

- Accept only branded records associated with the United States market.
- Require a valid normalized GTIN and a nonempty ingredient list.
- Retain the newest source version for candidate screening while preserving source history.
- Exclude records explicitly marked discontinued from new public promotion.
- Store the USDA/FDC source ID, release, publication/modified date, source URL, import-batch hash, and CC0 attribution.
- Assign `EXTERNAL_DATABASE`; never `VERIFIED` or `PACKAGE_VERIFIED` during automated import.

### 3.2 Secondary source: Open Food Facts

Open Food Facts may be used to fill gaps, cross-check records, locate ingredient-panel evidence, and prioritize community demand. It must not automatically create a public passing product. OFF states that community data is not guaranteed accurate.

OFF bulk use must rely on the official CSV or JSONL dumps rather than high-volume API crawling:

- [OFF API and bulk-use guidance](https://openfoodfacts.github.io/openfoodfacts-server/api/)
- [OFF dataset tooling](https://openfoodfacts.github.io/openfoodfacts-python/usage/)
- [OFF licensing guidance](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/)

The OFF database is ODbL and its images use separate attribution/share-alike terms. Before OFF data is combined with the SnackCheck catalog, make and document one of these decisions:

1. Keep OFF-derived candidate/source data in a clearly segregated ODbL-compatible dataset and publish the required attribution/share-alike output; or
2. Obtain licensing advice confirming the intended combined-database design; or
3. Use OFF only for transient discovery and independently re-source every promoted product from USDA, a manufacturer, or a package photograph.

The default implementation is option 3 until an explicit licensing decision is approved.

### 3.3 Promotion evidence

An external database record can become a public product only after a reviewer confirms identity and current ingredient evidence from one or more of:

- A manufacturer-controlled product or ingredient page.
- A brand-controlled SmartLabel page used under applicable terms.
- A retained, legible package photograph.
- A reviewed community submission through SnackCheck's secure photo pipeline.

Manufacturer and package sources must retain observed date, URL/reference, attribution/license notes when applicable, formulation hash, and the reviewer/audit record.

### 3.4 Optional commercial sources

After measuring USDA coverage, request quotes only if a clear gap remains from sources such as 1WorldSync, Syndigo, GS1/GDSN, or a manufacturer-authorized product feed. Do not purchase or integrate a feed without reviewing field coverage, update frequency, redistribution rights, image rights, retention rights, and termination behavior.

## 4. Catalog trust states

Keep bulk candidates separate from public products. The candidate workflow uses the following states:

1. `IMPORTED` — structurally valid source record stored with provenance.
2. `SCREENED_PASS` — deterministic engine found no enabled prohibited match, but evidence is not independently verified.
3. `SCREENED_FAIL` — deterministic engine found one or more enabled prohibited matches.
4. `SCREENED_VERIFY` — incomplete, ambiguous, unparseable, stale, or otherwise insufficient evidence.
5. `REVIEW_QUEUED` — selected for human evidence review.
6. `PROMOTED` — reviewer created or updated the canonical product/formulation using approved evidence.
7. `REJECTED` — unusable, wrong market, invalid identity, or inadequate source.
8. `SUPERSEDED` — replaced by a newer source version.

These candidate states do not replace the existing formulation verification statuses. Promotion maps reviewed evidence to the existing `VERIFIED` or `PACKAGE_VERIFIED` status, while unreviewed source data remains `EXTERNAL_DATABASE`.

The existing approved projection remains authoritative and already requires:

- A published Arizona ruleset.
- `PASS` under the current ruleset hash.
- `VERIFIED` or `PACKAGE_VERIFIED` formulation evidence.
- Current freshness.
- No open formulation conflict.
- An active product.

## 5. Data architecture

### 5.1 Preserve existing production tables

Continue using the existing canonical tables for public-quality records:

- `products`
- `product_identifiers`
- `product_aliases`
- `formulations`
- `formulation_sources`
- `formulation_ingredients`
- `compliance_evaluations`
- `compliance_matches`

Continue using `import_catalog_row` only for reviewed promotion. Do not pass a bulk USDA/OFF dump directly into the canonical importer.

### 5.2 Add a candidate staging layer

Add a forward migration, expected to be `0028_catalog_candidate_staging.sql`, containing private/admin-only structures similar to:

#### `catalog_import_batches`

- Provider and dataset release.
- Source URL and license identifier.
- Original file SHA-256 and byte size.
- Started/completed timestamps and status.
- Dry-run/apply mode.
- Read, accepted, rejected, duplicate, and superseded counts.
- Parser/normalizer version and ruleset hash used for screening.
- Minimal error-category counts; no secrets or full ingredient text in logs.

#### `catalog_source_records`

- Provider plus immutable external record/version ID.
- Normalized GTIN-14 and source GTIN.
- Product/brand/category/size fields.
- Raw and normalized ingredient text plus SHA-256.
- Market country, source modification/publication date, discontinued marker.
- Source URL/reference, license/attribution fields, and import batch.
- Deterministic screening result, quality flags, matched rule IDs, engine version, and ruleset hash.
- Candidate state and timestamps.
- Link to a canonical product/formulation after promotion.

Use row-level security so anonymous users cannot read candidate records. Only authorized operations roles may inspect or promote them. The service role may import them through a narrow server-only path.

### 5.3 Idempotency and history

- Idempotency key: provider + external record ID + source version/hash.
- A repeated identical release is unchanged.
- A changed ingredient hash creates a successor source record and marks the older candidate superseded; it never overwrites canonical formulation history.
- GTIN collisions group records for review; they do not silently merge different ingredient formulations.
- Promotion uses the existing transactional product/formulation operations and audit trail.

## 6. Import and screening pipeline

### 6.1 Streaming ingestion

Build provider adapters that stream compressed input rather than loading a multi-gigabyte file into memory.

Each adapter maps source data into one shared candidate contract and performs:

1. Required-field validation.
2. GTIN normalization and checksum validation.
3. US-market filtering.
4. Discontinued/version handling.
5. Ingredient parsing and quality flags.
6. Deterministic evaluation against an explicitly selected ruleset snapshot.
7. Provenance and license capture.
8. Idempotent candidate upsert.

The default command is dry-run and writes a privacy-safe report. Apply mode requires an explicit confirmation phrase, an authorized non-production target, and a bounded row limit for the first runs. Production linking/push commands remain forbidden.

### 6.2 No AI by default

Clean source ingredient text goes directly through the deterministic parser. Do not call an AI provider for ordinary USDA/OFF rows.

AI may be used only for a separately approved queue containing:

- Legible ingredient-panel images needing transcription.
- Formatting that the deterministic parser cannot safely interpret.
- Candidate duplicate/variant suggestions presented to a reviewer.

AI never promotes a candidate, changes verification status, or returns the Arizona determination. Every call uses existing provider limits, kill switches, token/cost ledger, maximum-call policy, and human confirmation.

At the measured Phase 7 average of approximately `$0.002082` per image, 10,000 similar one-call images would be approximately `$20.82` and 100,000 approximately `$208.20`. These are planning estimates, not budgets or guarantees. Image acquisition, retries, licensing, and human review are expected to dominate model cost.

## 7. Review and promotion workflow

Extend the protected admin console with a catalog candidate queue:

- Filter by source, screen result, category, quality flag, freshness, and conflict.
- Show source product identity, GTIN, ingredient text, source dates, license, and deterministic matches.
- Compare USDA/OFF/manufacturer/package observations side by side.
- Reject unusable or stale evidence with a reason.
- Send promising candidates to evidence review.
- Promote only after explicit acknowledgement of product identity, current ingredient text, and source sufficiency.
- Reuse existing duplicate-product and formulation-conflict workflows.
- Record reviewer, candidate version, source hashes, canonical product/formulation IDs, and an audit summary in the same transaction.

No bulk “approve all passing candidates” control is permitted.

## 8. “What can I bring?” discovery experience

The existing `/approved` route is the foundation. Enhance it only after real public-eligible records exist.

### 8.1 MVP

- Category-first landing sections for common snacks, drinks, treats, breakfast items, crackers/chips, and lunchbox components based on actual imported categories.
- Brand, category, verification tier, and freshness filters.
- Expose `individually_packaged` through the approved projection only when supported by sourced data.
- Clear result count, evidence date, package variant/size, and “compare the current package” guidance.
- Replace “approved” claims with “passes the current Arizona 11-ingredient screen.”
- Preserve `PASS` / `FAIL` / `VERIFY` language and applicability explanation.

### 8.2 Safe alternatives

From a product with `FAIL` or `VERIFY`, offer a link to current passing products in the same sourced category. Alternatives use neutral ordering such as category match, evidence freshness, and name. Affiliate commission, retailer relationship, and AI output cannot affect inclusion or order.

### 8.3 Catalog growth loop

- Unknown barcode and zero-result search may offer “Request this product.”
- A user may optionally start the existing secure package-photo flow.
- Privacy-safe demand counts prioritize the review queue without storing ingredient text, GTINs in analytics payloads, or user identity unnecessarily.
- “Report a package change” creates review work and immediately avoids claiming a newly reported formulation is still current when evidence warrants a hold.

Lunchbox lists, favorites, personalization, retail availability, and conversational discovery are later enhancements. They must not delay the first trustworthy browse-and-alternatives experience.

## 9. Delivery slices

### PR #8 — Candidate ingestion foundation (`COMPLETE`, open and unmerged)

- Candidate staging migration and RLS/pgTAP.
- Shared source-record contract.
- USDA adapter with small committed synthetic fixtures only.
- Streaming/dry-run/apply controls and import audit.
- Deterministic screening and idempotency tests.
- No external download, staging migration, or real data import.

**Acceptance:** CI applies the migration twice, generated types match, fixtures cover changed versions/duplicates/invalid GTINs/missing ingredients, no candidate becomes public, and production flags/data remain unchanged.

### PR #9 — Admin review and promotion

- Candidate queue/detail pages and authorization.
- Evidence comparison, reject, queue, and transactional promotion.
- Audit history and conflict handling.
- No mass approval.

**Acceptance:** disposable database tests prove unauthorized access fails, stale edits fail, external candidates cannot bypass review, promotion creates exactly one canonical evidence graph, and the approved projection remains empty without a published ruleset and reviewed formulation.

### PR #10 — Discovery and alternatives

- Approved projection exposes only supported discovery attributes.
- Category-first “What can I bring?” experience.
- Safe alternative links from `FAIL`/`VERIFY` products.
- Freshness/source/report-change UI and accessibility/E2E coverage.

**Acceptance:** every displayed item satisfies strict approved eligibility; empty/unavailable states remain honest; no ranking input includes affiliate economics; mobile Chrome/WebKit and axe pass.

### Data operation — non-production pilot

After PRs are green and separately approved:

1. Download and hash the current USDA branded dataset.
2. Dry-run locally or in an isolated job.
3. Review counts and error categories.
4. Apply migrations to the designated staging Supabase project.
5. Import a bounded sample, then a larger US candidate batch.
6. Review coverage, duplicates, parsing quality, and candidate distribution.
7. Select approximately 200 high-value candidates across useful categories.
8. Promote at least 50–100 only after manufacturer/package evidence review.

No candidate or product is imported into production during this pilot.

## 10. Test and quality gates

### Unit

- Provider mapping, GTIN normalization, market filter, version selection, discontinued handling, license fields, idempotency, and source hashing.
- Ingredient parser quality flags and deterministic screen mapping.
- Candidate state transitions and promotion eligibility.
- Public wording and alternative-ranking neutrality.

### Database / pgTAP

- Candidate RLS and role authorization.
- Import-batch immutability and idempotency.
- Successor/superseded behavior.
- GTIN collision handling.
- Transactional promotion/audit behavior.
- No `EXTERNAL_DATABASE` formulation in the approved projection.
- No public approved result without the current published ruleset hash, current verified formulation, and conflict-free product.

### Integration

- Stream a bounded fixture archive without whole-file buffering.
- Dry-run performs no writes.
- Apply rejects a missing confirmation or non-staging target.
- Source changes create history rather than overwrite it.
- Promoted formulation source/evaluation hashes match.

### E2E

- Admin candidate review and stale-edit failure.
- Public category browse, filters, alternatives, empty states, and inaccessible/unavailable ruleset states.
- Mobile Chromium/WebKit and accessibility.

### Security and privacy

- Service-role imports remain server-only.
- Candidate data is not anonymous-readable.
- Import logs omit full ingredient text, tokens, secrets, and raw source payloads.
- Dataset artifacts are not committed.
- Remote URLs are treated as data, never executable instructions.
- No automated crawling bypasses terms, robots controls, authentication, or rate limits.

## 11. Metrics

Track privacy-safe operational measures:

- Source rows read/accepted/rejected/superseded.
- Valid US GTIN and ingredient-text coverage.
- `SCREENED_PASS` / `FAIL` / `VERIFY` distribution.
- Parser quality-flag distribution.
- Duplicate/conflict rate.
- Review throughput and time to promotion.
- Public products by category, source tier, and freshness.
- Unknown barcode and zero-result demand counts.
- Package-change reports and time to resolution.
- AI calls, token usage, estimated/billed cost, retries, and false-confidence cases for the optional image queue.

Do not define success as the raw number of imported rows. The primary catalog metric is the number of current, source-backed, reviewed products that remain eligible for public discovery.

## 12. Approval gates

Approval of this plan authorizes only implementation of PR #8 with committed synthetic fixtures and local/disposable CI validation. It does **not** authorize any external data download or database change.

Separate explicit approvals are required for:

1. Downloading the multi-gigabyte USDA or OFF datasets.
2. Applying candidate migrations to staging.
3. Importing real candidates into staging.
4. Enabling any optional AI candidate-processing batch and its dollar cap.
5. Using or combining OFF data after the licensing decision.
6. Recording regulatory review evidence.
7. Publishing the Arizona ruleset.
8. Applying migrations or importing reviewed products into production.
9. Enabling production camera, photo, AI, affiliates, or any rollout.

## 13. Recommended approval scope

Approve **PR #8 only** first. It creates the safe candidate-ingestion machinery and proves it with synthetic fixtures. Stop for review with a clean Phase Completion Report. Then decide whether to approve the real USDA download and non-production pilot based on the proven importer and exact storage/runtime estimate.

## 14. Definition of beta-ready catalog

- Arizona source/scope/alias/public-copy review recorded with reviewer, date, URLs, and reproducible ruleset hash.
- Reviewed ruleset published through the protected lifecycle.
- At least 50 current, source-backed, manually reviewed passing products, with a target of 100 for the first invited beta.
- Useful category coverage rather than one-brand or one-category concentration.
- No fabricated product, ingredient, date, source, image, or availability record.
- Every public item passes the current approved projection.
- Stale or changed products disappear from passing discovery safely.
- “What can I bring?” and safe alternatives pass mobile/accessibility tests.
- Stable staging monitoring is green; production backup/restore and Vercel rollback gates are recorded before public rollout.
- Production camera, photo, AI, and affiliate capabilities remain independently gated.
