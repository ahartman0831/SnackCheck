# Phase 11 USDA staging pilot

Date: 2026-08-31

## Outcome

`COMPLETE` for the approved bounded pilot. The existing Supabase project
`lhnbxjvqllohlbtdncyg` is explicitly designated as SnackCheck's
pre-production/staging project. No production database exists yet, and this
project must either be wiped before launch or remain staging while a separate
production project is created.

## Source and reproducibility

- Provider: USDA FoodData Central Global Branded Food Products Database
- Download release: April 2026 (`2026-04-30`)
- Official archive: `FoodData_Central_branded_food_csv_2026-04-30.zip`
- Archive size: `448767220` bytes
- Archive SHA-256:
  `26050a5d03197469813754743a21ee0fad4ccf22b6aac2a995846a987719fc49`
- Joined pilot input SHA-256:
  `9af94d5b822950d248b6df9728d8bf31b00dca56058fc90ee7acc44290f53f4d`
- License recorded by the importer: `CC0-1.0`

The relational `food.csv` and `branded_food.csv` files each contained
1,999,950 rows and joined one-to-one on `fdc_id`. The privacy-safe pilot input
selected every 199th joined source row to produce a deterministic 10,000-row
sample spanning the archive. Dataset artifacts remain outside the repository
under `/private/tmp` and are not committed.

## Dry run

The importer read 10,000 source rows without making database calls:

- Accepted: 9,690
- Rejected: 310
- Preliminary deterministic screen: 8,990 `PASS`, 338 `FAIL`, 362 `VERIFY`
- Unique normalized GTINs: 9,544
- Duplicate GTIN observations: 146
- Parser warnings: 386
- Rejections: 243 invalid GTINs, 28 missing ingredient lists, 19 discontinued
  records, 14 invalid rows, and 6 non-U.S. records

These are candidate-screening results under the explicit draft AZ-HSA snapshot,
not regulatory approval and not public product eligibility.

## Staging schema reconciliation

The first apply attempt failed before creating an import batch because staging
did not contain the Phase 11 import function. Inspection showed that migrations
`0028`, `0029`, and `0030` had not been applied. Their exact committed,
CI-tested SQL was applied in order through the Supabase staging SQL editor. No
CLI link or database push was used.

## Bounded apply

The approved apply cap was 500 source rows. The completed private staging batch
recorded:

- Rows read: 500
- Candidates stored: 489
- Unique normalized GTINs: 489
- Rejected: 11 (4 invalid GTINs, 5 invalid rows, 2 missing ingredient lists)
- Candidate states: 463 `SCREENED_PASS`, 14 `SCREENED_FAIL`, 12
  `SCREENED_VERIFY`
- Parser warnings: 13
- Unchanged or superseded records: 0

Independent read-only verification matched the completed batch summary. The
strict public discovery function returned zero rows after the import.
An anonymous client received PostgreSQL error `42501` and zero rows when it
attempted to read the private candidate table, confirming the access boundary.

## Safety and scope

- No candidate was promoted to a canonical product.
- No candidate became an approved or publicly searchable product.
- No Arizona ruleset or alias was reviewed, signed, or published.
- No AI provider was called and no AI spend was incurred.
- Production camera, photo, AI, affiliate, and catalog flags were unchanged.
- No production database, deployment, catalog, or user data was changed.

## Recommended next action

Build a category-balanced shortlist of approximately 200 useful
`SCREENED_PASS` candidates, then queue them for evidence review. Promotion must
remain one product at a time and requires current package or independent HTTPS
manufacturer evidence; USDA cannot verify its own imported candidate.
