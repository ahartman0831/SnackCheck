# Definition of done — ingredient-screening beta

The owner selected option A on September 9, 2026: paste/confirm ingredient screening
first, with the verified catalog following later. This replaces the earlier
50-product prerequisite for the beta only. Preserve search/barcode/review tooling.
Do not weaken rules or evidence controls to create public inventory.

## Engineering release candidate

A candidate is technically merge-ready when the current head of PR #22 passes all
three required CI jobs and the final adversarial review has no unresolved technical
P0/P1. [RELEASE_AUDIT.md](RELEASE_AUDIT.md) records the result and known limits.

- Production build, formatting, lint, types, unit/API/integration tests and high/
  critical dependency and secret gates pass; no skipped failures count as success.
- Migrations 0001–0039 create a new database; repeated resets, actual pgTAP discovery,
  generated-type parity, private-storage and disposable recovery checks pass.
- Home → ingredient text → confirmation → result works on desktop/mobile. Declared
  restrictions with published rules produce FAIL; unverified no-match lists remain
  VERIFY. Missing rules cannot produce invented matches or passing results.
- Input/network/provider/storage failures retain edits and give recovery actions.
  Empty catalog, disabled optional features and unavailable rules are explicit.
- Admin refresh/logout, active-role checks, signed submission ownership, stale-write
  rejection, RLS and privacy boundaries pass. Review/publication/promotion are audited
  and rehearsed with controlled local fixtures; real signatures are never simulated.
- Production rate limits fail closed; privileged credentials remain server-only;
  logs avoid private inputs. Optional AI is bounded, confirmed and off for the beta.
- Primary layouts and accessibility pass automated checks. Physical camera/photo
  acceptance is needed only before enabling those deferred features.
- One understandable architecture, one current status record, exact review packets,
  and one explicit PR merge path are available to the next engineer.

## Public launch

Public release additionally requires owner-controlled inputs and approvals:

- Recorded review of all enabled restrictions/aliases, source interpretation,
  applicability, effective dates and exact final ruleset hash; separate authorized
  publication. The 28 color-name proposals remain disabled pending real review.
- Separate production projects/domain and real support/SMTP/Upstash configuration;
  production sign-in, primary workflow, role isolation and abuse-limit smoke tests.
- Actual alert delivery, retention schedule, backup/restore and deployment rollback
  evidence from the configured environment.
- Owner acceptance of privacy/terms/support/retention copy matching enabled behavior.
- Explicit final public launch authorization after those results are available.

These external actions do not invalidate a technically complete, merge-ready build.
A disclaimer is not regulatory sign-off or proof of reduced legal liability. The
site describes ingredient screening rather than nutrition, allergy, food-safety or
school-acceptance certification. No lawyer-per-snack requirement is imposed here.

## Follow-on catalog and optional releases

The catalog release retains the target of 50 current independently evidenced real
products and a reviewed accuracy sample. Ingredient records alone are not approved
packages. Resolve identity, text differences, freshness and source permission before
promotion; do not invent manufacturer evidence or relabel secondary sources.

Affiliate activation needs actual account/mappings, safe centralized destinations,
visible disclosures, neutral ranking and tracking-independent navigation. Consumer
accounts/history, school administration, national/native/offline expansion and
photo/camera/AI activation remain deferred with their own acceptance gates.
