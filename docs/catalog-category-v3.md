# Catalog category policy v3 — September 8, 2026

## Outcome and current gate

The category mismatch from the 100-row USDA import is fixed locally in
`classroom-use-v3`. A read-only staging assessment produces a bounded shortlist
of **60 candidates with 60 distinct barcodes**. No hosted schema, candidate state,
evidence record or publication was changed by this follow-up.

Staging application requires migration `0038_catalog_relevance_v3.sql`. Data access
works, but the available service credentials do not provide schema administration;
the Supabase CLI has no management login and browser control could not start.
The owner has been asked to enable CLI or connector access. This is an access
requirement, not another request for database-population approval.

## Policy changes

- Broad `Biscuits/Cookies`, `Snacks`, `Processed Cereal Products` and
  `Fruit - Prepared/Processed` labels require a matching product name. A brand
  name or ingredient-search hit cannot provide that match.
- Cracker packs, ready-to-eat popcorn, identified cereal/protein/streusel bars,
  and applesauce cups/pouches can be classified without changing the raw source
  category. Unrelated meat, oil, milk, infant-food and baking categories remain
  outside this expansion.
- Microwave/unpopped popcorn, kernels, seasoning and preparation ingredients are
  excluded from the new mappings. Source package weights of at least three pounds
  or 48 ounces are treated conservatively as bulk cases for those mappings.
  This is a queue-priority heuristic, not a package-safety or nutrition judgment.
- Plural `bars` now earns the same portable-product score as singular `bar`.
- Ingredient uncertainty still routes to human exceptions. Published eligibility,
  source permissions, independent evidence and legal sign-off are unchanged.

Migration 0038 replaces three existing guarded functions without changing their
signatures or granting new permissions. Version-2 assessments and historical
evidence queues remain supported. Each assessment must match its run version;
each shortlist must match its candidates' stored policy version. Unknown versions
and mixed-version batches are rejected. Both versions retain the existing source,
quality, state, size, audit and idempotency requirements.

## Read-only staging evidence

The snapshot contains 589 candidates. Under v3:

- 163 route to automatic evidence, 6 to human exceptions and 420 are deprioritized.
- 120 have high relevance, 55 medium, 49 low and 365 are excluded.
- 69 existing score/route assessments change; none of the 94 previously queued
  candidates loses automatic-evidence eligibility.
- The bounded 60-candidate shortlist has 27 processed-cereal products,
  23 cracker products and 10 snack products across six brands.

These are **dry-run outcomes**, not persisted queue counts or verified foods.
The exact saved source snapshot and 60-item manifest are in the ignored local
folder `data/catalog-imports/category-v3/`.

- Assessment selection hash:
  `2d7a6c7c46c308fa6bc47ecf2782c8e0ea10fcc81b04da5a04ffb857de046845`
- Shortlist selection hash:
  `4ffe608588880f531c1ebb3149531767147b79ad919dac3786107cb6fa0209f8`
- Migration 0038 SHA-256:
  `4cba26b5be8a4089380fa11bec022a647de01b29f28f11217bbec7c47088c21f`

## Verification

Local focused unit suite: 16 passing tests, including broad-category recognition,
preparation/bulk exclusions, ingredient uncertainty and shortlist inclusion.
Workspace typecheck, lint and formatting pass.

The isolated local PostgreSQL instance applied migrations through 0038.
All **20 pgTAP files / 301 assertions pass**, including unchanged v2 tests and
11 new v3 assertions covering version mismatches, assessment/queue replay,
evidence manifest creation, and absence of public product or rules publication.
All test fixtures rolled back. Full CI results are recorded on the follow-up PR.

The initial full local stack hit the known Colima analytics socket mount problem;
the database-only stack provided actual PostgreSQL verification. Full-stack
browser, storage, reset and restore checks remain in Ubuntu CI.

## Exact next staging operation

Use only the owner-designated project `lhnbxjvqllohlbtdncyg`. Do not use a general
`supabase db push`: older individually applied migrations have incomplete remote
history. Apply the exact reviewed migration 0038 transactionally through SQL
administration after confirming its three prerequisite functions exist.

Then load the existing staging environment privately and perform, in order:

1. Repeat the relevance dry run and compare its selection hash with this report.
   Investigate drift before applying. Apply with
   `APPLY_CLASSROOM_RELEVANCE_TO_STAGING` and record the run ID.
2. Repeat the shortlist dry run with `--target-count 60` and compare its exact
   60 IDs and selection hash with `shortlist-manifest.json`. Apply with
   `QUEUE_CATALOG_SHORTLIST_TO_STAGING` and record the run ID.
3. Read back version, scores, routes and all queued IDs; verify the audit entries,
   anonymous denial, and unchanged zero public products/published rules.
4. Continue bounded permitted independent-evidence collection. Keep source
   conflicts and uncertain identity/formulation matches in review. No candidate
   promotion or ruleset publication is authorized by this queue operation.

Stop before a dependent operation if the migration is unavailable, a hash changes,
or a database eligibility guard rejects the selection. Do not substitute a v2
label on v3 assessments to work around the schema requirement.
