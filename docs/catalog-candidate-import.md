# Catalog candidate import

This command stages external product records for screening and later review. It does not create public products, verified formulations, or approved-search results.

## Safety model

- Dry-run is the default and makes no database calls.
- Apply accepts only the explicit `staging` target, an exact confirmation phrase, and a limit of at most 10,000 source rows.
- The project named by `CATALOG_PRODUCTION_SUPABASE_PROJECT_REF` and the Vercel
  Production environment are rejected. Apply also requires
  `CATALOG_STAGING_SUPABASE_PROJECT_REF` to match the target URL exactly.
- Only the service role can call the candidate import functions. Candidate tables are not readable by anonymous or ordinary signed-in users.
- Replaying an identical source version is unchanged. A newer source version preserves and supersedes the older candidate. An older version arriving later is stored as superseded rather than replacing the current candidate.
- Candidate screening is not product verification. No bulk candidate can enter the public passing-products projection.

## Supported foundation input

PR #8 supports a UTF-8 USDA branded-food CSV or gzip-compressed CSV. The adapter recognizes official branded fields including `fdc_id`, `gtin_upc`, `brand_owner`, `brand_name`, `ingredients`, `branded_food_category`, `market_country`, source dates, and discontinued date. A `description` or `food_description` column must be present in the input; for the downloadable relational CSV this is supplied by a streaming/preprocessing join with `food.csv` in the separately approved pilot.

The committed fixture is synthetic. No real USDA or Open Food Facts dump is included or downloaded.

## Dry-run example

```sh
pnpm import:candidates \
  --file apps/web/tests/fixtures/usda-branded-synthetic.csv \
  --ruleset-file path/to/explicit-ruleset-snapshot.json \
  --dataset-release synthetic-2026-08 \
  --max-rows 100 \
  --dry-run
```

The output contains only counts and error categories. It does not log ingredient text, product identifiers, source payloads, credentials, or ownership tokens.

## Apply gate

Apply is reserved for a separately approved non-production pilot after migration `0028` has been applied to the designated staging database. It additionally requires staging Supabase credentials and `CATALOG_STAGING_SUPABASE_PROJECT_REF` matching that URL in the process environment, plus:

```sh
--apply --target staging --confirm IMPORT_CATALOG_CANDIDATES_TO_STAGING
```

Do not use `supabase link`, `supabase db push`, production credentials, or a production URL for this workflow.

## Project designation

Supabase project `lhnbxjvqllohlbtdncyg` is SnackCheck's pre-production/staging
project. The owner explicitly confirmed this designation on 2026-08-31 because
SnackCheck has no live production environment. A future production launch must
use a different Supabase project and set
`CATALOG_PRODUCTION_SUPABASE_PROJECT_REF` to that project's reference before any
catalog operation is enabled there. The current staging project may instead be
wiped before launch, but it must never be silently promoted into production with
pilot candidate data intact.
