# Color-name review packet — September 9, 2026

## Status and source

Migration `0039_fda_color_label_aliases.sql` is verified in owner-designated staging
`lhnbxjvqllohlbtdncyg`. It saves 28 **disabled, pending-review** proposals and an FDA
source reference. No reviewer identity, review date or approval was invented.
The database's named-review requirement remains enforced.

[FDA's color-additive labeling explanation](https://www.fda.gov/food/color-additives-information-consumers/color-additives-questions-and-answers-consumers)
lists the numbered FD&C colors and recognizes full and abbreviated names, using
Blue 1 as an example. This supports label-name identity. It does not establish
Arizona applicability, a health claim or a current approval for every use.

The proposed mapping covers seven statutory color names: Yellow dye 5, Yellow dye
6, Blue dye 1, Blue dye 2, Green dye 3, Red dye 3 and Red dye 40. Each has four
proposed label forms, illustrated by Red 40:

- `Red 40`
- `Red No. 40`
- `FD&C Red 40`
- `FD&C Red No. 40`

All use exact parsed-segment matching. Lakes, E-numbers and chemical synonyms are
outside this proposal and remain disabled. The reviewer must verify the source,
each mapping and its matching behavior before enabling it, then review/sign the
resulting full ruleset before publication.

## Engine fixes and review-only impact

Engine `0.1.2` handles sentence punctuation after a number, such as `Red 40.`, while
preserving decimal distinctions such as `40.1` and `.40`. Exact-segment matching
also recognizes an explicit `may contain` lead-in while preserving the original
label text and precautionary classification.

The preview helper keeps proposed aliases separate from the actual draft. It
rejects published or corrupted input snapshots, does not mutate its input, and
returns a `reviewOnly` result. It is not exported by the application package's
public entry point. The offline report script has no database client, provider
requests or apply mode.

All **589 candidate ingredient lists** were screened with both the actual draft and
the proposal. These are internal ingredient-screen results, not public approvals:

- Actual draft: 563 PASS, 14 FAIL, 12 VERIFY.
- Proposed mappings: 529 PASS, 48 FAIL, 12 VERIFY.
- 34 lists change from PASS to FAIL in the proposal.
- 41 lists gain at least one recognized substance, including seven that already
  matched another restricted ingredient.

All **60 shortlisted OFF records** were checked. Eleven have new proposed matches;
one has malformed nesting and still needs text review; 41 need identity/ingredient
comparison; three records were not found and four have no ingredient text. An OFF
match describes that saved source text, not necessarily a current package.

The actual draft's missing mappings still limit its screening coverage. Neither a
zero current match nor a zero proposed match clears source quality, freshness,
identity or publication requirements.

## Verified staging boundaries

Readback confirmed all 589 candidate rows and the entire ruleset row/canonical
payload are unchanged. All 28 proposals are pending, disabled and unsigned.
Anonymous users cannot select the candidate table. Public products, formulations
and published rulesets remain zero. No paid AI calls were made.

- Actual draft hash: `0a6dc59239f351b62f2b39f75aa2291b491963fcb168f9a3c2cfae2efc5531e6`
- Counterfactual preview hash: `636aacc701a5e200480f595016f6d0f54750422233b6de3e8c9241812de584d2`
- Migration SHA-256: `d13a11a33785b90b0a6f8fe077d931efde0b3728c5a6fa11dfc8ed49808137b6`

The preview hash is not an enabled or signed database version. Existing candidate
screens remain historical results with their original engine/ruleset provenance.
After alias approval, use an audited rescreen operation before acting on those
stored screens; do not overwrite their history with this counterfactual report.

Private input snapshots, the exact applied transaction, verification readback and
`color-alias-preview.json` are retained in ignored `data/catalog-imports/category-v3/`.
The report can be reproduced without network access:

```sh
node --import tsx scripts/preview-catalog-color-aliases.ts \
  --ruleset-file data/catalog-imports/population-2026-09-08/draft-ruleset.json \
  --candidates-file data/catalog-imports/category-v3/color-alias-before.json \
  --off-review-file data/catalog-imports/category-v3/off-shortlist-coverage-review.json \
  --output-file data/catalog-imports/category-v3/color-alias-preview.json
```

Local verification passes 368 unit tests (75 compliance, five contracts, 288 web),
repository type checks and 21 database test files with 307 assertions. Database
coverage includes refusal to enable a sourced proposal without a named reviewer.

## Continue catalog acquisition

The [evidence acquisition plan](catalog-package-checks.md) prioritizes existing
licensed records and concrete source conflicts. Owner-supplied photos are not a
catalog bootstrap requirement. Continue collecting permitted evidence for other
candidates while individual products remain unresolved.
