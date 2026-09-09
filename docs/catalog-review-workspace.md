# Catalog ingestion-to-review workflow

The USDA importer and evidence collectors now feed the same private review workspace.
Reviewers can inspect saved ingredient evidence directly in the app instead of finding
it in database exports. This closes a missing connection between collection and review;
it does not change product approval or publication requirements.

## Operator path

1. Run the existing bounded USDA import with its source file and ruleset snapshot.
   Start with a dry run; the import preserves source attribution, ingredients,
   identifiers and screening provenance in staging.
2. Run relevance assessment and shortlist selection. These prioritize snack candidates
   and queue the explicit selected records.
3. Collect evidence for an explicit candidate manifest. Existing OFF and permitted
   manufacturer collectors retain their request budgets and source policies.
4. Run the new read-only batch review, then open `/admin/catalog`. Catalog-wide counts
   show imported records, queued candidates, saved evidence records, assembled dossiers,
   created products and published rulesets. These units are distinct; none is presented
   as the number of publicly approved snacks.
5. Open a candidate to compare the USDA ingredients with saved evidence. The page shows
   source product identity, ingredients, source links, licenses, attribution, record
   update dates, collection dates, text differences and missing/malformed evidence.
   The existing review/promotion controls remain separate and require their existing
   evidence and acknowledgement.

The batch command accepts 1–100 explicit unique candidate IDs and an output path:

```sh
node --env-file=.env.local --import tsx apps/web/scripts/review-catalog-batch.ts \
  --manifest data/catalog-imports/category-v3/review-batch-manifest.json \
  --output data/catalog-imports/category-v3/reviewer-packets.json
```

The manifest is an object containing `candidateIds`. Use the configured staging
project. Keep outputs under ignored `data/catalog-imports/`; they contain private
candidate and source evidence. With credentials already exported, the equivalent
package command is `pnpm review:catalog --manifest <path> --output <path>`.
The command requires every requested candidate to exist and refuses incomplete
history above 1,000 evidence attempts; use a smaller batch in that case. It does not
collect new provider data, call AI, change database records or approve products.

## Comparison boundaries

OFF ingredient text is decoded from its saved JSON snapshot. The collector intentionally
does not put secondary ingredient text in the manufacturer-only ingredient column.
The review workspace preserves that distinction. A text match does not establish
current formulation, independent provenance or approval. Record-edit dates are not
package-label dates, and secondary evidence does not satisfy the current manufacturer
requirement for publication.

Only the newest saved attempt per source URL is compared. The page fetches the latest
20 attempts for one candidate and explicitly warns when older history exists. A failed
query does not appear as a zero count or a false empty evidence history. Source links
must be credential-free standard HTTPS. React renders source text as text, not HTML.
Every server read requires an active reviewer, regulatory admin or super admin; the
packet builder additionally rejects evidence belonging to another candidate.

No owner-supplied product photography is required to use this workflow. Missing
records remain acquisition work for licensed data and permitted sources.

## September 9 staging run

Ran the new review command against the exact 60 candidates in the prior USDA shortlist.
All 60 have collection attempts, and 53 have saved ingredient text to compare. Seven
need ingredient evidence. The private output retains every selected candidate and
source reference; source differences and parser warnings remain unresolved review
items. The command made zero database writes, provider requests or paid AI calls.

Validation includes focused tests for authorization, counts unavailable on errors,
wrong-candidate evidence isolation, latest-snapshot selection, differing barcodes,
malformed source text, missing evidence, unsafe URLs, attribution and review-only UI.
The real-database browser journey now imports a controlled CSV through the actual USDA
adapter, records it using the guarded staging RPCs, collects a controlled evidence
snapshot, opens the reviewer comparison, checks promotion remains disabled, and proves
sign-out hides private evidence. This browser fixture runs only in a disposable local
database; it is not a real product or part of the staging catalog.
