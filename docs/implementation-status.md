# Implementation status — September 9, 2026

## Proposed informational-model update

See [informational-screening.md](informational-screening.md). The new PR permits
one authorized admin to approve/publish sourced rules, retains optional review,
versioning, auditing and rollback, and uses informational public labels. Migration
0040 is not applied to hosted projects; no rules are published by this work.

## Previous verified baseline

The engineering release candidate delivers the owner-approved ingredient-screening
beta. Home → paste → confirm → real stored result is implemented and covered on
desktop/mobile. Declared restrictions match published rules; unverified no-match
lists remain VERIFY. Engine 0.1.3 (proposed informational wording), private USDA/OFF ingestion and review, authentication,
ownership, abuse controls and migration/recovery verification are complete.

[RELEASE_AUDIT.md](RELEASE_AUDIT.md) is the single current release record, including
verification, limitations and the final adversarial review.
[PR #22](https://github.com/ahartman0831/SnackCheck/pull/22) is merged as `8b98d0f`;
all three main CI jobs passed. #20/#21 are superseded. Vercel production builds
remain paused, and the beta has not been deployed publicly. Earlier phase histories
remain in git and their explicitly historical documents.

Staging: 589 private candidates, 154 queued, zero products/formulations/published
rules/dossiers. Sixty exact review packets and the unsigned rules packet are ready
in [release-review](release-review/README.md). Preparation does not equal approval.

The separate `SnackCheck Production` database is created on owner-approved Micro
compute. All 39 migrations and application schema/access checks are verified;
there are zero users, products, submissions or published rules. It has not been
connected to the website. The production draft has its own recorded canonical hash.

## REQUIRES OWNER ACTION

The five exact actions and what can proceed without each are in
[the release record](RELEASE_AUDIT.md#requires-owner-action): support inbox confirmation,
owner/admin rules approval (independent review optional), production handoff, public policy acceptance and
final launch authorization. Public deployment and real production service tests
remain unperformed. These external gates do not make completed engineering unfinished.

## DEFERRED

The owner selected ingredient screening first; the 50-product catalog follows.
Optional camera/photo/AI, affiliate activation, consumer accounts, school management,
nationwide/native/offline expansion and new evidence architecture are outside this
beta. Catalog evidence conflicts stay explicit and private.
