# Launch runbook — ingredient-screening beta

[Release audit](RELEASE_AUDIT.md) is the current status authority.
[Definition of done](DEFINITION_OF_DONE.md) separates engineering completion from
public launch. Historical phase plans are not deployment evidence.

## Release and environment

PR #22 (`codex/catalog-category-v3`) was merged into `main` with owner approval as
`8b98d0fd1deedd091b6d51a7bd46a5a97786715e`. Its approved head was `72fbc92`, and all
three [main CI jobs passed](https://github.com/ahartman0831/SnackCheck/actions/runs/34355142034).
It includes #20/#21; those are superseded and must not be merged separately.
No public deployment or rules publication is authorized by the merge.

Use Node 22.23.2, pnpm 10.33.0 and Supabase CLI 2.84.2. Engine version is 0.1.3 in the informational-screening PR.
The owner selected Vercel `snack-check-web` in `Hartman Dev` and temporary URL
`https://snack-check-web.vercel.app`; a custom domain is deferred. Keep the saved
**Only build pre-production** behavior: the merge's production build was canceled
by that setting and the live site remains on the prior `ee1b1c5` release.
The beta has not been deployed publicly. Supabase production project
`lwkayhbmpirgpfytfryv` was created on the owner-approved Micro tier and all 39
migrations verified; staging `lhnbxjvqllohlbtdncyg` remains separate. Bootstrap
verification, the unpublished production rules hash, and remaining inputs are in the
[production handoff](release-review/production-handoff.md).

## Verification before merge

CI has three required jobs: verify, Local Supabase reset and pgTAP, Playwright WebKit.
It builds the default production app, checks code/security/dependencies, runs public
and camera browser cases, and tests the real local homepage/ingredient/review journey
in Chromium and WebKit over disposable HTTPS. Database gates apply all 40 migrations,
check generated types/private storage, rehearse backup/restore, reset and rerun SQL.
CI must never link or mutate a hosted database. See [test matrix](TEST_MATRIX.md).

## Production preparation after owner handoff

1. Complete [production-handoff.md](release-review/production-handoff.md) without
   putting secret values in files or messages. Use separate environment settings for
   preview and production. Next.js local env belongs in `apps/web/.env.local`.
2. The new production database has reviewed migrations 0001–0039. Migration 0040
   is proposed and requires separate authorization before hosted application. Keep the draft
   rules unpublished. For any future fresh bootstrap, apply 0001–0016 atomically
   with a zero-published-rules commit check, because legacy 0015 temporarily marks
   the seed published before 0016 removes that state. Never blindly push to the linked staging project: its
   migration ledger ends before manually applied, verified later migrations. Inspect
   and reconcile history before any future staging migration operation.
3. Set domain/support/SMTP/Supabase and separate random HMAC secrets of 32+ characters.
   Production requires Upstash. Memory fallback is forbidden there. Per-visitor
   identity currently trusts Vercel's platform header; another host needs an approved
   proxy adapter or uses conservative shared buckets.
4. Deploy the release commit to an access-controlled preview and verify admin OTP,
   session refresh/logout, ownership, private storage, support and ingredient checks.
   Use the protected lifecycle for owner/admin approval and publication of a sourced
   ruleset. A separate expert/human review is optional, as described in the
   [informational-screening model](informational-screening.md).
5. Configure and exercise synthetic health/alerts, agreed retention, restore into a
   separate project and deployment rollback. Record exact project/commit/URL, rules
   hash, operator, timestamps, outcomes and limitations. The existing procedures are
   in [operations monitoring and recovery](operations-monitoring-and-recovery.md).
6. Present those concrete results for final public launch authorization. The owner
   already selected ingredient screening; 50 products are not this beta's gate.

Keep camera/photo/paid AI/affiliates off. Existing kill switches and feature flags
must be checked in the actual environment. Manual ingredient screening calls no LLM.
Do not enable deferred features merely to make an empty setting appear complete.

## Rollback

Use the last verified immutable Vercel deployment. Stop optional providers first,
verify public/protected health and the manual ingredient journey, and record the
rollback. Do not reverse production migrations or edit published rules in place;
use a reviewed forward migration or cloned ruleset version. Real production restore
and rollback remain unperformed until the owner-controlled environment is available.
