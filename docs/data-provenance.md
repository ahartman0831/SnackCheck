# Data provenance

Every public product, formulation, school-participation claim, and enabled alias must point at a stored source.

## Source classes

- `STATUTE` and `AGENCY_GUIDANCE` — regulatory
- `MANUFACTURER` and `PACKAGE_PHOTO` — product evidence
- `EXTERNAL_DATABASE` — Open Food Facts or similar, never auto-verified
- `COMMUNITY_SUBMISSION` — parent-confirmed extraction
- `ADMIN_ENTRY` — operator-entered metadata with audit

## Rules

- Do not fabricate ingredients, verification dates, or manufacturer evidence.
- Do not treat Open Food Facts as guaranteed accurate.
- Chemical synonyms stay `PENDING_REVIEW` until a reviewer attaches provenance.
- Production seed contains no mock products.
