# Catalog category policy v3 — September 8, 2026

## Verified staging outcome — September 9, 2026

Migration `0038_catalog_relevance_v3.sql` is applied to the owner-designated
staging project `lhnbxjvqllohlbtdncyg`. All 589 private candidates now have v3
assessments, and the exact reviewed 60-candidate shortlist was queued. The queue
contains **154 candidates: the existing 94 plus 60 new candidates**.

The authenticated preflight matched all three prerequisite function bodies and
permissions to migrations 0032/0033. The reviewed migration checksum matched, and
0038 was applied in one explicit transaction. Hosted function bodies now match
0038 exactly; execution remains restricted to the existing service role and owner.
No general migration push or remote-history repair was used.

Readback at `2026-09-09T10:35:05.823Z` verified every assessment's version, score,
tier, route and reasons; the exact 60 manifest IDs; all 589 assessment audit rows
and 60 queue audit rows; and preservation of source and screening fields. The 94
previously queued candidates remain queued. Anonymous candidate reads return
HTTP 401 / PostgreSQL `42501`. Public products, formulations and published
rulesets remain at zero. Queueing does not establish verified food eligibility.

- Assessment run: `ff4e2eb2-c29f-4d25-b4d0-d4769abc1d94`
- Shortlist run: `cbe3d737-2f9c-4fd9-be2a-8d85da6fc78f`
- Saved local evidence: `data/catalog-imports/category-v3/staging-readback.json`
  and `staging-verification.json` (ignored; contains private candidate records).

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

## Selection evidence

The snapshot contains 589 candidates. Under v3:

- 163 route to automatic evidence, 6 to human exceptions and 420 are deprioritized.
- 120 have high relevance, 55 medium, 49 low and 365 are excluded.
- 69 existing score/route assessments change; none of the 94 previously queued
  candidates loses automatic-evidence eligibility.
- The bounded 60-candidate shortlist has 27 processed-cereal products,
  23 cracker products and 10 snack products across six brands.

The repeated staging dry runs matched both original selection hashes before
application. The counts above are now persisted and verified; candidates still
require independent evidence and the existing approval gates.
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
All test fixtures rolled back. Implementation commit
`8721b5b79a9a7f1c440e4848364dc220062c97e8` passed all three CI jobs in
[run 34303284627](https://github.com/ahartman0831/SnackCheck/actions/runs/34303284627),
including WebKit, all eight real-database browser cases, generated types, private
storage, a clean schema reset and backup/restore.

The initial full local stack hit the known Colima analytics socket mount problem;
the database-only stack provided actual PostgreSQL verification. Full-stack
browser, storage, reset and restore checks passed in Ubuntu CI.

## Next evidence step

Continue bounded permitted independent-evidence collection for queued candidates.
Keep source conflicts and uncertain identity/formulation matches in review.
The owner supplied the Open Food Facts contact on September 9; the identifying
user agent is configured in ignored local environments. The existing collector's
five-candidate pilot selected eligible queued candidates by ID (it was not limited
to the newest 60). Run `8c44d1aa-967a-44fc-9764-adedf10ebc8f` completed with five
requests and five persisted evidence records, with no missing, blocked or failed
retrievals. Normalized ingredient text matched in three records and differed in two.
A text match alone does not establish current package identity or independent provenance.
Database readback confirmed all five attempt IDs, the completed run, 154 still queued,
and zero products, formulations or published rules. No paid AI call was made.
The original queue operation did not create evidence; this subsequent pilot did.
Further collection should select an explicit manifest or skip completed attempts,
because rerunning the current collector selects the same first candidates.

For any future staging schema work, continue using only the owner-designated project
and exact reviewed SQL. Older individually applied migrations have incomplete remote
history, so a general `supabase db push` requires separate reconciliation first.
