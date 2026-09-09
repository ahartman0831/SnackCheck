# Launch runbook — ingredient-screening beta

[Release audit](RELEASE_AUDIT.md) is the current status authority.
[Definition of done](DEFINITION_OF_DONE.md) separates engineering completion from
public launch. Historical phase plans are not deployment evidence.

## Release and environment

The sole merge path is PR #22 (`codex/catalog-category-v3`) directly into `main`.
It includes #20/#21; those are superseded and must not be merged separately.
Require all three CI jobs at the current head, then explicit owner merge permission.
No public deployment or rules publication is implied by merge authorization.

Use Node 22.23.2, pnpm 10.33.0 and Supabase CLI 2.84.2. Engine version is 0.1.2.
Production project/domain and live deployment are unverified. The existing Vercel
project is an account lead, not evidence of a successful current production release.
The staging project `lhnbxjvqllohlbtdncyg` must remain separate.

## Verification before merge

CI has three required jobs: verify, Local Supabase reset and pgTAP, Playwright WebKit.
It builds the default production app, checks code/security/dependencies, runs public
and camera browser cases, and tests the real local homepage/ingredient/review journey
in Chromium and WebKit over disposable HTTPS. Database gates apply all 39 migrations,
check generated types/private storage, rehearse backup/restore, reset and rerun SQL.
CI must never link or mutate a hosted database. See [test matrix](TEST_MATRIX.md).

## Production preparation after owner handoff

1. Complete [production-handoff.md](release-review/production-handoff.md) without
   putting secret values in files or messages. Use separate environment settings for
   preview and production. Next.js local env belongs in `apps/web/.env.local`.
2. Create the new production database from reviewed migrations 0001–0039. Keep the
   draft rules unpublished. Never blindly push to the linked staging project: its
   migration ledger ends before manually applied, verified later migrations. Inspect
   and reconcile history before any future staging migration operation.
3. Set domain/support/SMTP/Supabase and separate random HMAC secrets of 32+ characters.
   Production requires Upstash. Memory fallback is forbidden there. Per-visitor
   identity currently trusts Vercel's platform header; another host needs an approved
   proxy adapter or uses conservative shared buckets.
4. Deploy the release commit to an access-controlled preview and verify admin OTP,
   session refresh/logout, ownership, private storage, support and ingredient checks.
   Use the protected lifecycle for actual reviewed rules and a separate publisher.
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
