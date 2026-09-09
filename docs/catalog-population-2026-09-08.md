# Safe staging catalog population — September 8, 2026

The owner explicitly approved safe database population in the takeover task.
The target was the previously designated staging project
`lhnbxjvqllohlbtdncyg`. No production target, publication, AI provider or paid
service was used.

## Result

Imported **100 real USDA candidates**, bringing the private candidate table from
**489 to 589 rows**. Batch `661de6ed-caea-4213-80d9-9a3da74599dd` completed at
`2026-09-09T01:58:18.970216Z` (September 8 in Arizona).

- Dry run: 100 read, 100 accepted, zero rejected.
- Apply: 100 accepted, zero unchanged, zero superseded, zero rejected.
- Read-back compared every stored product identity, barcode, brand, category,
  ingredient statement and ingredient hash to the saved full USDA response.
- All 198 supplied source dates were checked and were not in the future. Two
  source dates were absent; no substitute verification date was invented.
- Public products: zero. Formulations: zero. Published rulesets: zero.
- Anonymous candidate access returned HTTP 401 / PostgreSQL `42501`.

The records are **unverified source candidates**, not approved foods. Their
preliminary `SCREENED_PASS` state comes from the existing **unpublished** draft
ruleset. It cannot establish legal compliance or public eligibility.

## Source and reproducibility

Used the official [USDA FoodData Central API](https://fdc.nal.usda.gov/api-guide/),
whose data is published under CC0-1.0. Six total API requests used the documented
public demo key within the returned request allowance:

1. Four branded-food searches: `crackers`, `popcorn`, `applesauce`, `granola bar`.
   Each used page 1, descending FDC ID. The first search returned 50; the first 25
   were selected. Each other search returned 25.
2. Two full-detail requests for 50 unique FDC IDs each. The full records, including
   source dates and discontinued status, supplied the import fields.

Search results can match ingredient text and therefore include unrelated foods.
This selection is a bounded exploration of current data, not a representative
launch assortment. Source category names were preserved exactly.

An initial full-archive download timed out; its incomplete file was deleted and
none of its bytes were used for the import.

The ignored local folder `data/catalog-imports/population-2026-09-08/` contains the
full source response, selected FDC IDs, exact CSV, draft snapshot, database
read-back and verification results. These files contain no operational keys.

- Full source response SHA-256:
  `3308b91df0602f2f49d374c65b3d36a7714c05126d3d459a459fa51d0fa372a9`
- CSV SHA-256 (65,915 bytes):
  `2d620e8f3f6887b05fdfd2a45619c44914929f093ea78a684adaa3629b23552d`
- Draft ruleset canonical hash, independently recomputed and matching staging:
  `0a6dc59239f351b62f2b39f75aa2291b491963fcb168f9a3c2cfae2efc5531e6`
- Importer: `usda-branded-csv-v1`; engine: `0.1.1`; release label:
  `USDA-FDC-API-retrieved-2026-09-09`.

The CSV maps documented full-detail fields directly to the existing USDA column
names. It does not manufacture GTINs, ingredient statements, package sizes,
verification dates or source category aliases.

Run a replay **dry run** from the repository root with:

```bash
node --import tsx apps/web/scripts/import-catalog-candidates.ts \
  --file data/catalog-imports/population-2026-09-08/candidates.csv \
  --ruleset-file data/catalog-imports/population-2026-09-08/draft-ruleset.json \
  --dataset-release USDA-FDC-API-retrieved-2026-09-09 \
  --source-url https://api.nal.usda.gov/fdc/v1/foods \
  --max-rows 100 --dry-run
```

Actual apply used the existing guarded command with `--apply --target staging
--confirm IMPORT_CATALOG_CANDIDATES_TO_STAGING`, privately loaded staging
credentials, and no schema changes or direct table insert.

## Relevance and next evidence work

The audited `classroom-use-v2` assessment ran over 589 records after a dry run.
Its selection hash was
`cf0df181588552d196909a659956068e570d810489136b2aa26f34bba4793896`;
run ID `89af3f09-9dea-4929-9c9f-67fe3309aa2f`.

All 100 new records remain `DEPRIORITIZED`: the current category allowlist does
not recognize their newer broad USDA labels, such as `Biscuits/Cookies`,
`Snacks` and `Processed Cereal Products`. Automatic evidence work was not forced
past that policy. Existing totals remain 95 automatic-evidence candidates and
6 human exceptions; 488 are now deprioritized. The 94 previously queued
candidates remain queued.

A future catalog expansion should add tested, versioned category mappings and
select actual portable products before sourcing independent evidence. Broad
processed-food categories must not automatically qualify every member. The
existing evidence queue can proceed independently. Current package or permitted
manufacturer evidence, reviewer confirmation, signed rules and protected
publication remain required for launch inventory.
