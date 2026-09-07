# Phase 11 evidence collection

Status: `PARTIAL`

Implementation CI is green on GitHub Actions run 34048327317. Migration `0033` remains
unapplied to staging.

This slice turns the 95 promising private candidates into a bounded evidence workload.
It does not approve, promote, publish, or rank a product. Open Food Facts records are
secondary leads only; they cannot satisfy SnackCheck's independent manufacturer/package
evidence gate.

## Implemented boundaries

- Source URLs must be credential-free HTTPS on an explicitly permitted manufacturer or
  secondary-evidence host.
- Search results, social pages, retailers, non-standard ports, unsafe redirects, oversized
  responses, and incomplete provenance are rejected.
- Runs are capped at 100 candidates, five requests per candidate, 500 requests total, and
  five MB per response. The OFF command is tighter: at most 15 candidates, one request per
  candidate, 250 KB per response, and a 4.1-second minimum interval.
- Migration `0033` stores private run manifests and immutable per-candidate outcomes behind
  row-level security. The service role reads the tables but writes only through guarded,
  idempotent functions.
- Every completed run must account for every planned candidate. Request counts, retrieved
  bytes, outcomes, hashes, provenance, and audit events are preserved.
- Only current `REVIEW_QUEUED`, deterministic `PASS`, clean `AUTO_EVIDENCE` candidates can
  enter an applied run.

## Open Food Facts obligations

The implementation follows the current official guidance:

- product reads are limited to 15 requests per minute per IP;
- an identifying `AppName/Version (ContactEmail)` User-Agent is required;
- the API usage form and terms must be completed before a live pilot;
- database reuse is recorded under ODbL 1.0 and individual database contents under DbCL
  1.0; and
- OFF data is community supplied and is never treated as guaranteed or independent proof.

References:

- <https://openfoodfacts.github.io/openfoodfacts-server/api/#before-you-start>
- <https://openfoodfacts.github.io/openfoodfacts-server/api/#rate-limits>
- <https://openfoodfacts.github.io/openfoodfacts-server/api/#authentication>

## Command behavior

The owner submitted the API usage form on 2026-09-07. `pnpm collect:evidence:off` is
dry-run by default but does make controlled OFF read requests. It outputs counts,
candidate outcome codes, product identity fields, and an exact/different/missing ingredient
comparison verdict. It does not print ingredient text.

## First read-only OFF pilot

On 2026-09-07, after the usage form was submitted, two bounded dry runs read the same five
exact barcodes. Both runs made five requests, found five records, and had zero missing,
blocked, or failed outcomes. Neither run wrote to staging or called an AI provider.

The comparison run (`1e91db83-6074-4d9d-ba8e-88f6cc42976c`, selection hash
`6046ee95dd593428e255dc533b8ee221c22f68bec9c5e7a468909fa0fb311bb4`) found four
exact normalized ingredient matches and one difference. The differing Cheez-It snack-mix
record must remain a conflict requiring better evidence; it is not an
automatic match. All five OFF records remain community-supplied secondary evidence and
cannot independently approve or publish a product.

Applied staging persistence additionally requires all of the following:

- `--apply`
- `--target staging`
- `--confirm COLLECT_CATALOG_EVIDENCE_TO_STAGING`
- matching `CATALOG_STAGING_SUPABASE_PROJECT_REF` and `SUPABASE_PROJECT_ID`
- a lowercase UUID supplied with `--run-id` for deterministic retries

Do not run either mode without an identifying contact in `OPEN_FOOD_FACTS_USER_AGENT`.
Do not apply migration `0033` to staging without explicit owner approval.
