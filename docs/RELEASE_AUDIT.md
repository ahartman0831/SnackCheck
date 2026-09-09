# SnackCheck release candidate — September 9, 2026

Current course correction: [informational-screening model](informational-screening.md).
Its PR permits single-admin approval/publication and changes public result wording;
independent review is optional. Hosted changes and public launch remain unauthorized.

## READY NOW

**Engineering release candidate for the owner-approved ingredient-screening beta.**
Build completion and public launch approval are separate decisions. The owner chose
option A on September 9: lead with paste/confirm ingredient screening; grow the
verified catalog after the beta. The former 50-product requirement applies to the
catalog release, not this beta. No new evidence architecture is part of closeout.

**Merged:** [PR #22 → main](https://github.com/ahartman0831/SnackCheck/pull/22), with
owner approval for head `72fbc92`, produced `8b98d0f`. All three
[main CI jobs passed](https://github.com/ahartman0831/SnackCheck/actions/runs/34355142034).
It contains all commits from #20 and #21 without rebasing shared history. Those PRs
are superseded; do not merge them separately. Vercel's owner-approved **Only build
pre-production** setting canceled the merge's production build. The existing public
site remains on `ee1b1c5`; the beta has not been deployed or launched publicly.

**Product:** the homepage leads to the real paste/confirm journey. It creates an
owned private submission, processes text without an LLM, saves the confirmed result
and preserves the tab-local draft. With reviewed published rules, declared matches
return FAIL; an unverified no-match list remains VERIFY. Missing rules also return
VERIFY and explain that restrictions could not be screened. Search and barcode
fallback remain available with honest limited-catalog/empty states. Ordinary users
need no account. Results explain ingredient-only scope, package uncertainty and
school-policy limits; they do not offer nutrition, allergy or safety guarantees.

**Engineering/security:** one deterministic engine (0.1.2), shared contracts,
server-enforced ownership and active admin roles, expiring sessions, audited review
transactions, strict public projections, bounded providers, rate limits and
fail-closed costly work. No known unresolved engineering P0/P1 was found in the
final adversarial review. [Review findings and evidence](release-review/README.md)
record the customer, returning-user, adversary, QA, owner and maintainer checks.

**Verification:** the full release CI runs formatting, lint, types, 388 unit tests
(75 compliance, 5 contracts, 308 web), integration checks, production builds,
dependency/secret gates, public/camera WebKit, and real database desktop/mobile
journeys. Database checks cover migrations 0001–0039, 22 SQL files / 317 assertions
on two resets, generated-type parity, private storage and disposable backup/restore.
The historical rollback-only rehearsal exercised separate reviewer/publisher identities,
audited publication, candidate promotion, public eligibility and immediate withdrawal
on an evidence conflict. Controlled test signatures/products never enter staging.
The route test runs the actual engine with clearly labeled fixture rules; it is not
real regulatory approval. Browser coverage starts at the beta homepage CTA.

The merged release's main checks above include the closeout changes and are the
release authority. Existing optional browser skips do not establish physical-device acceptance;
the dedicated database journey has zero skips. Linux CI verifies the default build
and WebKit that this Mac cannot reliably exercise. Local SQL and targeted release
checks additionally pass. No paid provider call is required by or used for this beta.

The prior redacted history scan covered 902 text blobs / 136 reachable commits with
no credential candidates. CI scans the final tracked tree; scan coverage is bounded.
Dependency audit remains enforced at high/critical severity. The existing moderate
Vitest/mocker advisory affects an unused mocker dev-server mode; a major test-tool
upgrade is deferred, with no advisory suppressed. Optional photo extraction retains
validated output, confirmation, timeout/retry/token/spend limits and kill switches;
its paid production availability and device accuracy are not beta acceptance claims.

**Catalog preparation:** staging readback confirms 589 private candidates, 154 queued,
and zero products, formulations, published rules or dossiers. All 60 recent shortlist
records have OFF attempts; 53 contain ingredient evidence. The exact review packets
classify 48 ingredient differences, five text repairs and seven missing-evidence
cases. The recommended promotion manifest is deliberately empty because none meets
the current evidence policy. The 28 sourced color-name proposals remain disabled and
unsigned. [Frozen review materials](release-review/README.md) contain exact rules,
source references, deterministic IDs/hashes and recommended decisions. No owner
photos, invented manufacturer evidence, rule signatures or publication were used.

## REQUIRES OWNER ACTION

1. **Confirm support routing during launch preparation, deferred for now.** The
   owner prefers assistant triage and unsent reply drafts; no monitoring or
   forwarding should be set up while the beta is not live. This does not block
   independent engineering preparation. The owner approved the
   approximately $10/month additional Micro compute, and the separate production
   project `lwkayhbmpirgpfytfryv` now has all 39 migrations, verified application
   types/access controls, empty user/content storage, and zero published rules.
   Vercel and the temporary beta URL are confirmed; production builds stay paused.
   The [production handoff](release-review/production-handoff.md) records details.
2. **Have an authorized owner/admin approve the sourced ruleset for informational
   screening.** A separate human or expert review is optional and not a launch
   blocker. [The current model](informational-screening.md) preserves source/hash,
   immutable-version and audit controls. Actual rules publication remains a separate
   authorized action; this PR publishes nothing.
3. **Complete the [production handoff](release-review/production-handoff.md).**
   Supply the remaining service/contact assignments after the new database exists.
   Accounts, credentials and paid commitments remain with the owner. Once access is
   available, engineering can configure and verify SMTP, limits, monitoring,
   retention, backup/restore and rollback; these tests are not being delegated to
   the owner. Local/CI verification and private review proceed without this input.
4. **Approve the deployed privacy, terms, support and retention wording for the
   selected beta.** Draft copy is implemented; business/legal acceptance is not
   inferred from it. Technical preview and rules review can proceed while pending.
5. **Approve public launch after the configured production smoke/recovery checks
   are recorded.** No production smoke result is claimed today. Merge, private
   preview, rules review and catalog preparation can all proceed before go-live.

## DEFERRED

The 50-product verified catalog and its accuracy sample follow the ingredient beta,
as explicitly selected by the owner. Current source conflicts and manufacturer
permission gaps remain recorded, not resolved by relabeling OFF evidence. A future
alternative evidence policy, automatic rescreening/promotion and unattended catalog
expansion need a separate bounded change; none blocks this release candidate.

Amazon Associates remains intended but inactive: no tag, real ASIN mapping, affiliate
link builder/redirect or click revenue is claimed. Enablement needs the actual
account/mappings, disclosed safe links and tracking that cannot block navigation or
influence ranking. Camera/photo and paid AI stay off pending separate provider and
physical-device acceptance. Consumer accounts/history, school administration,
nationwide expansion, native apps, full offline/PWA and speculative new features
remain outside the beta. Existing schema and useful implementation are preserved.
