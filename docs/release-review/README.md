# Frozen release review — September 9, 2026

The owner selected the ingredient-screening beta (option A). This packet prepares
review and the catalog follow-on without recording a human signature or changing
hosted publication. [Release status](../RELEASE_AUDIT.md) owns the current merge gate.

## Exact regulatory packet

[ruleset-review.json](ruleset-review.json) contains the read-back draft, all eleven
substances, all 49 alias rows including the 28 pending proposals, seven contexts,
five source references and the SQL canonical payload. IDs are stable; no user IDs,
credentials or product ingredient records are included. This is an unsigned snapshot,
not a review certificate. Review the effective dates, applicability summaries and
source interpretation as well as name matching.

- Ruleset: `33333333-3333-3333-3333-333333333333`, AZ-HSA v1.
- Actual unsigned hash: `0a6dc59239f351b62f2b39f75aa2291b491963fcb168f9a3c2cfae2efc5531e6`.
- Preview with all 28 proposals: `636aacc701a5e200480f595016f6d0f54750422233b6de3e8c9241812de584d2`.
- Engine: 0.1.2. The preview hash is not an approved or published version.

Recommended reviewer decisions: accept the 28 exact-segment numbered-color forms
only after reviewing the recorded FDA evidence and tests; retain pending lake,
E-number and chemical-name proposals as disabled; verify the full Arizona source
interpretation and public summaries before signing the resulting canonical hash.
The [color review packet](../catalog-color-alias-review.md) explains all mappings,
limits and the deterministic 589-record impact: 34 additional ingredient lists
would gain a failing screen. Those are text matches, not package adjudications.
This recommendation does not substitute for regulatory or legal acceptance.

Record alias decisions with the real reviewer's identity/evidence first, regenerate
the exact canonical snapshot/hash, then record the full review through
`/admin/rulesets`. The reviewer uploads or supplies an HTTPS review document and its
SHA-256 and confirms the current hash. A different active regulatory administrator
must use the protected publication action with that hash, reviewed timestamp and
typed PUBLISH confirmation. If anything changed, stop and rereview the new hash.
The agent has not enabled aliases, signed the review or published any ruleset.

## Exact catalog packet and recommendation

[catalog-review-manifest.json](catalog-review-manifest.json) fixes all 60 candidate
IDs, barcodes, USDA ingredient hashes, evidence-attempt IDs and next decisions. It
references the full private packet and its SHA-256 at
`data/catalog-imports/category-v3/reviewer-packets.json`. The private reviewer UI
also displays these saved sources to an authenticated active reviewer.

Recommended decisions are HOLD for all 60: 48 source-text differences, five parser
repairs and seven missing-ingredient cases. No source record date is claimed to be
a current package date. The bounded promotion manifest is empty. OFF remains
licensed secondary evidence; the present promotion/dossier policy requires current
manufacturer ingredient evidence and actual identity review. Owner photographs are
not required. We did not fabricate permissions or expand source architecture.
The three prioritized conflicts remain in [package checks](../catalog-package-checks.md).

The [review workflow](../catalog-review-workspace.md) reproduces the packet using the
60 IDs. The existing offline alias preview reproduces the source-text screening.
`review-artifacts.sha256` fixes the public packet/manifest bytes. Full private packets
are intentionally excluded from git; the source files and recorded IDs are retained
in the owner's ignored local data directory and authenticated staging workspace.

## Bounded promotion/publication rehearsal

`supabase/tests/0021_release_publication_rehearsal.sql` uses only controlled fixture
identities and a fictional product inside BEGIN/ROLLBACK on disposable PostgreSQL.
It records a fixture review, rejects self-publication, lets a different fixture
administrator publish, checks audit entries, queues/promotes a candidate through
the real transaction, checks anonymous eligibility, then verifies an evidence
conflict withdraws approval. It also proves publication does not enable pending
aliases. Ten assertions pass locally and run on both CI resets. No hosted write,
manufacturer fetch, paid AI request or real reviewer signature is involved.

`release-confirmed-ingredients.test.ts` exercises the real route and engine with
fixture rules and mocked persistence: declared restriction → FAIL, no-match pasted
text → VERIFY, unavailable rules → no matching, rejected write → no cleared
ownership cookie, unowned submission → no read/write. The browser suite independently
proves real local persistence, homepage entry, reviewer sessions and private review
in Chromium/WebKit. Neither kind of test certifies real ingredient accuracy.

## Final adversarial review

- **New customer:** the old homepage sent the main action to an empty catalog and
  described an inactive AI step. Repaired for the selected beta: prominent ingredient
  action, paste/confirm steps, limited catalog explanation and truthful result next
  steps. Full database browser journey now starts from that action.
- **Returning customer:** tab-local draft survives reload; denied storage keeps an
  in-memory draft; edits clear old results. No personal-history/account promise.
- **Malicious user:** server-side submission ownership, active roles, stale versions,
  RLS and private storage; expired reviewer session refresh and sign-out; self-publish
  rejection, unowned confirmation rejection, and fail-closed production rate limits.
- **QA:** unavailable rules cannot match/clear products; user text cannot become
  verified PASS; failed persistence cannot consume ownership; provider errors,
  malformed inputs, duplicate actions, source conflicts, future dates and mobile
  accessibility remain covered. SQL positive publication/promotion is now rehearsed,
  not inferred from tests that only rejected bad requests.
- **Business owner:** beta scope is explicitly approved. Zero catalog products is
  truthful and no longer an engineering blocker. Rules, real production operations,
  policies and public launch remain explicit external actions. AI/affiliates are off.
- **Future engineer:** one PR directly to main, current status reduced to one record,
  archived baseline labeled historical, runtime/setup/production handoff updated,
  and deterministic review inputs retained. No history rewrite or owner-file deletion.

No unresolved engineering P0/P1 was found in this bounded final review. It does not
claim a production deployment, a human regulatory signature, a real catalog accuracy
sample or physical-device acceptance for disabled features. The existing dependency
audit and limited secret scanning remain enforced; no new framework or feature lane
was added to finish the release.
