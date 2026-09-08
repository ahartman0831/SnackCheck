# Phase 11 evidence collection

Status: `PARTIAL`

Implementation CI is green on GitHub Actions run 34129932286. Migration `0033` was applied
only to the owner-designated staging project on 2026-09-07.

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

## First persisted staging pilot

After explicit owner approval, migration `0033` was applied as a single SQL file to staging
project `lhnbxjvqllohlbtdncyg`. A normal migration push was not used because the remote
migration-history table stops at `0022` even though later schemas were previously applied
individually; repairing that bookkeeping remains a separate operational task.

Run `3f156574-689b-4b6c-aed7-c42b342ea967` persisted the same five-candidate selection
under selection hash
`6046ee95dd593428e255dc533b8ee221c22f68bec9c5e7a468909fa0fb311bb4`.
Independent database read-back confirmed:

- status `COMPLETED`, with five planned and five attempted candidates;
- five immutable evidence attempts and five exact manifest rows;
- five requests and 8,453 retrieved bytes;
- five OFF records with the required host, ODbL/DbCL license, and attribution;
- four exact normalized ingredient matches and one difference;
- zero missing, blocked, or failed outcomes; and
- two run audit entries, covering start and close.

The pilot created no product or formulation and made no AI call, approval, promotion, or
publication.

## Manufacturer evidence foundation

The next local slice adds a manifest-driven official manufacturer collector. It does not
search or scrape the general web. Each manifest entry must bind one eligible candidate and
GTIN to one credential-free HTTPS product page on an explicitly reviewed manufacturer
host. The entry also records the terms/collection-policy reference and a review date that
must be no more than one year old.

The adapter reads at most one bounded HTML or JSON response per candidate, follows the
existing final-URL policy, hashes the original response, and preserves a compact product
snapshot rather than a full web page. It extracts only declared Product JSON-LD/meta facts
and a bounded visible ingredient section. A manufacturer page that declares a different
GTIN is blocked before it can become evidence. Retailers, search results, unreviewed hosts,
stale terms reviews, unsafe redirects, unsupported content, and oversized responses remain
fail-closed.

`pnpm collect:evidence:manufacturer -- --manifest <path>` is dry-run by default. It accepts
at most 15 reviewed entries, one request per candidate, and 500 KB per response. Apply mode
uses the same exact staging confirmation and private persistence functions as other
evidence runs. No real manufacturer manifest or live request is included in this slice.

## AI comparison foundation

The local AI comparison layer compares candidate identity and ingredient text against up
to four supplied evidence records. It uses a strict structured-output schema and a
non-retained OpenAI Responses API request with no tools or browsing. Provider request ID,
model, prompt version, latency, input/cached/output/reasoning tokens, outcome, confidence,
and discrepancy codes are returned for later persistence and pricing.

The model may only recommend `CONTINUE_DETERMINISTIC` or `HUMAN_EXCEPTION`; it cannot emit
or set compliance, eligibility, approval, PASS, FAIL, or VERIFY. Continuation requires a
matching identity, exact/formatting-only ingredient agreement, no discrepancy codes, and
confidence of at least 0.95. A deterministic normalized-text mismatch, missing ingredient
evidence, low confidence, invalid output, timeout, budget rejection, or provider failure
overrides the model and routes safely to `HUMAN_EXCEPTION`.

Official OpenAI API reference used for the structured-output and usage boundary:

- <https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create>

No paid AI comparison or staging comparison write was enabled by the initial local slice.
A guarded comparison ledger and explicit pilot approval were required before live use.

Migration `0034` adds that guarded ledger as the next reviewable slice. It keeps AI run
manifests, one claimed call per candidate, immutable structured outcomes, detailed token
fields, a snapshot of the verified rate card, calculated input/output/total cost, and a
link into the existing central `ai_usage_ledger`. It defaults to a closed kill switch. A
run may include at most five candidates and may begin only when each candidate has bounded
manufacturer ingredient evidence from migration `0033`.

Only guarded service-role functions may begin a run, claim spend, record a result, or close
the run. The database independently rejects optimistic continuation when identity,
ingredient agreement, discrepancy, confidence, or deterministic-conflict gates fail.
Start, attempt, and close actions are audited, and no comparison function can create or
publish a product. Migration `0034` passed the complete GitHub database suite and was
applied only to the owner-designated staging project on 2026-09-08. Generated types are
reconciled. The first five-attempt pilot failed closed because the local OpenAI credential
was invalid: no model output or token usage was returned, estimated spend was zero, all
five candidates stayed private, and the kill switch was restored to `true`. See
[`docs/catalog-evidence-ai-pilot-001.md`](catalog-evidence-ai-pilot-001.md).

Migration `0035` replaces the pilot's overly blunt five-attempt daily ceiling with three
independent controls: five candidates per reviewed run, 15 billable-or-uncertain
reservations per rolling hour, and 50 per UTC day. Definite authentication or invalid-
request rejections are refunded only when the provider returned no request ID, no tokens,
and no cost. The immutable attempt remains in both ledgers. Provider authentication
failure also closes the kill switch immediately, and the runner stops after the first
such rejection instead of repeating it across the batch. Reservation releases and circuit
breaker actions are service-only, idempotent, and audited.

Applied staging persistence additionally requires all of the following:

- `--apply`
- `--target staging`
- `--confirm COLLECT_CATALOG_EVIDENCE_TO_STAGING`
- matching `CATALOG_STAGING_SUPABASE_PROJECT_REF` and `SUPABASE_PROJECT_ID`
- a lowercase UUID supplied with `--run-id` for deterministic retries

Do not run either mode without an identifying contact in `OPEN_FOOD_FACTS_USER_AGENT`.
