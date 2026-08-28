# Data import runbook

Import sourced packaged-food rows only. The importer never invents ingredients, dates, images, UPCs, or verification status.

## Command

```bash
# Validate and print an audit summary. No writes.
pnpm import-products --file scripts/import-template.csv --dry-run

# Apply accepted rows. Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
pnpm import-products --file path/to/sourced.csv --apply
```

`--dry-run` is the default if `--apply` is omitted.

## Required columns

`gtin14`, `brand`, `name`, `raw_ingredients`, `source_type`, `source_url`, `observed_at`, `verification_status`

Optional: `primary_upc`, `variant`, `size`, `category`, `source_title`, `notes`

## Rules

- GTIN/UPC must pass checksum normalization.
- `source_url` must be an absolute http(s) URL.
- `observed_at` must be a real timestamp and must not be in the future.
- `source_type` and `verification_status` must be existing enum values.
- Empty required fields fail. The importer will not fill them in.
- Quote any field that contains commas, especially `raw_ingredients`.
- Duplicate `gtin14 + ingredient hash + source URL` rows in the same file are rejected.
- Re-running the same sourced file is idempotent: already-present keys are counted as unchanged.
- `--apply` writes each accepted row inside the `import_catalog_row` SQL transaction. Do not apply fabricated or sample rows to production.

## Approved-list eligibility (separate from import)

A row can be imported and still be absent from `/approved`. Approved browsing requires:

- a currently published Arizona ruleset
- stored classroom evaluation `PASS` against that ruleset hash
- `VERIFIED` or `PACKAGE_VERIFIED` evidence
- no formulation conflict
- `CURRENT` freshness
- not community-only, external-only, rejected, stale, or otherwise unconfirmed

Until the ruleset is signed and published, approved browsing returns no products.
