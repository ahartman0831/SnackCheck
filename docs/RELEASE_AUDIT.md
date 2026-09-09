# Release audit — September 8, 2026

**Decision: NOT READY FOR PUBLIC LAUNCH.** Local stabilization is verified; the
owner approved GitHub upload and safe staging population on September 8. Launch
still depends on real evidence, regulatory approval and production operations.
Work is on `codex/takeover-stabilization`; the inherited branch remains intact.

## READY — implemented and verified

### Product and engineering

The real local submission journey creates a private submission, processes pasted
text, confirms it, returns a truthful result and retains the user's draft. Unknown
rules produce VERIFY. Users cannot read someone else's submission. A temporary
reviewer with an expired access token refreshed the session, accessed the permitted
workspace and signed out through the production browser app.

Fixed endpoint-specific rate windows, per-visitor identity on Vercel, fail-closed
Redis timeouts, reviewer session refresh, future/missing evidence dates, stale
stored PASS cards, inactive barcode records, malformed pagination/intake, denied
browser storage, ignored extraction failures and misleading successful analytics.
Database failures in catalog reads now produce recoverable errors instead of false
empty results. Homepage step-number contrast was repaired following an axe failure.

Preserved the deterministic engine, shared contracts, three Supabase trust
boundaries, restricted public projections and transactional evidence review. Removed
the unreferenced `lib/vision` implementation. Engine version is now **0.1.1**.

### Verification evidence

- Workspace lint and TypeScript: pass.
- Formatting: pass; owner-supplied `Claude outputs/` is excluded from application
  formatting and left unchanged. All tracked application source remains checked.
- Full CI unit run: **320 passing tests** (42 compliance, 5 contracts, 273 web).
  Follow-up provider/redirect/input regressions also pass.
- Database runner-policy tests: **2 pass**; type-generation policy: **1 pass**.
  A zero-test pgTAP run now fails verification instead of silently succeeding.
- Production webpack build: pass, **40 generated pages**, including the new proxy.
- Database: migrations **0001–0037**, two schema resets, **19 SQL test files / 290
  assertions passing twice**; generated types match the committed file after the
  generator's normal trailing-newline normalization.
  The local CLI's container runner discovered zero files, so each SQL file was
  executed directly with PostgreSQL plus pgTAP and its assertion/plan output checked.
  Ubuntu CI subsequently passed the normal CLI harness and generated-type parity.
  The wrapper rejects zero-test results.
- Real storage/API integration: **6 tests pass, zero skipped**. Covers private
  sanitized images, raw deletion and eligible expired-asset cleanup. A reset-related
  local storage restart was needed. A later test under host contention exceeded
  Vitest's five-second default; integration tests now allow 30 seconds without
  changing assertions, and the final rerun completed in roughly three seconds.
- Disposable analytics backup/restore: pass. The rehearsal now requires explicit
  disposable-local confirmation and accepts an isolated local container name.
- Production desktop/mobile Chrome public suite: **46 pass**, with **42 existing
  project/feature-conditional skips**. These skips are not counted as verified
  camera/photo coverage. Accessibility checks report no serious/critical violations
  on tested pages after the contrast repair; widths 320–1440, dark mode, reduced
  motion and zoom pass.
- Dedicated real-database browser suite: **4 pass, zero skipped** in desktop Chrome,
  including real session expiry/refresh/logout. Ubuntu CI additionally runs
  desktop Chromium and mobile WebKit over disposable local HTTPS. Its initial
  failures led to the test-harness corrections recorded below. Final commit checks
  are linked from PR #21.

All live database and storage activity above used the disposable local
`snackcheck-takeover` stack. Hosted staging/production data and settings were not
changed. Browser screenshots were inspected and kept in temporary test output;
tracked historical screenshots were restored, not overwritten as new evidence.

### Approved staging population

The September 8 follow-up added 100 source-attributed USDA candidates through the
guarded importer, bringing staging to 589. Independent read-back verified all
100 identities and ingredient hashes, private access, and unchanged publication.
All new source categories remain outside automatic evidence work under the current
allowlist. See [the population report](catalog-population-2026-09-08.md) for exact
source hashes, batch IDs, query limits and the taxonomy limitation. This is private
candidate inventory, not 100 verified launch products.

### Security and AI

A redacted pattern scan inspected **902 historical text blobs across 136 reachable
commits** for private keys, common provider tokens, JWTs and credential-bearing
connection URLs. No candidates were found. This limited pattern scan is not a
complete guarantee against every possible credential format or removed history.
Privileged keys stay in server-only clients. No operational secret values were
added to source or documentation.

Dependency registry audit found **zero high/critical advisories**, and two moderate
entries for the same Vitest/mocker advisory,
[GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9). The affected
unauthenticated mocker dev-server plugin is not used by the current node/jsdom test
setup. Updating the test framework across a major version remains P2; no advisory
was suppressed and the dependency audit remains in CI.

Evidence retrieval now rejects redirects before requesting an unreviewed target.
Production analytics requires its own HMAC secret; events are aggregate counts,
not a verified unique-user measure. Costly operations stop on rate-limit failures.
Non-Vercel deployments deliberately share a conservative bucket until a trusted
proxy identity adapter is supplied.

Photo extraction uses configured OpenAI/Gemini adapters; defaults remain
`gpt-5.6-luna`, `gemini-3.5-flash-lite`, and `gemini-3.7-flash`. Their current paid
availability/accuracy was not revalidated and none was called during takeover.
OpenAI extraction has a 6,000 output-token cap; catalog comparison retains its
800-token cap. SDK retries are disabled so application attempts own the call budget.
Malformed-output token usage now survives validation failure in the ledger.
Structured output, timeouts, confirmation, escalation and deterministic fallback
remain in place. Photo/AI activation still requires its existing acceptance gates.

No paid provider request was made. Operating cost depends on configured pricing,
input images and enabled traffic; do not extrapolate the old five-comparison pilot
into a production forecast. Manual ingredient checks make no LLM call.

## REQUIRES OWNER ACTION / EXTERNAL VERIFICATION

1. **GitHub CI release gate.** Upload was explicitly approved and succeeded.
   [Draft PR #21](https://github.com/ahartman0831/SnackCheck/pull/21) is stacked on
   PR #20. Initial CI run 34300899968 passed verify, default Turbopack builds, public
   WebKit, camera WebKit, SQL tests, generated types and storage. The new database
   WebKit journey exposed HTTP Secure-cookie behavior and a test navigation race.
   Commit 6355676 adds disposable local HTTPS, retains production Secure cookies,
   waits for logout navigation, and asserts the actual confirmation response.
   Commit c779402 then checks the actual signed-out access-required page and
   absence of operational data instead of expecting an unimplemented redirect.
   All three jobs must pass on the current PR revision before merge; consult
   [PR #21 checks](https://github.com/ahartman0831/SnackCheck/pull/21/checks) for the
   final revision result. A partial run never counts as complete.
2. **Local platform limits.** This Mac still cannot run the default Turbopack build
   or current WebKit locally; Ubuntu CI has now exercised both successfully.
3. **Regulatory review.** A qualified reviewer must sign the exact sourced Arizona
   ruleset hash. A separately authorized administrator must publish it through the
   protected lifecycle. This cannot be replaced with a fixture or agent assertion.
4. **Launch catalog.** At least 50 current independently evidenced real products,
   reviewed identity/formulation/source dates, and an accuracy sample. Existing
   staged candidates and old pilot counts are not public approved inventory. Respect
   recorded source-permission blocks; use permitted feeds or current package evidence.
5. **Production environment.** Confirm separate Supabase/Vercel projects and final
   domain. Apply reviewed migrations, including 0037, through the approved release
   process. Set required keys, strong separate HMAC secrets and Upstash. Verify
   production environment isolation and admin roles.
6. **Support, legal and operations.** Supply real `SUPPORT_EMAIL`, configure and test
   SMTP, approve privacy/terms/retention and any provider disclosures, configure and
   exercise alert destinations, schedule retention, and rehearse production restore
   and Vercel rollback. Existing legal pages are not owner legal approval.
7. **Actual deployment smoke tests and final go-live approval.** No production
   deployment, smoke test or public launch was performed. Keep optional features off
   until device and provider acceptance is complete.

## DEFERRED UNTIL AFTER LAUNCH OR INDEPENDENT APPROVAL

Amazon Associates remains the intended commercial option, but there are no active
links, approved ASIN mappings, tracking ID, click redirects or affiliate revenues.
Use one central link builder with allowlisted destinations and visible approved
Amazon disclosure when the account/mappings are available. Click tracking must not
prevent navigation or influence compliance/ranking. No fake affiliate links were
added and monetization has not silently been declared complete.

Also deferred: consumer accounts/personal history, school-policy administration,
full offline/PWA behavior, native apps, nationwide expansion, large-scale automatic
promotion and unvalidated Gemini production use. Dormant schema was preserved.

## Next concrete action

Use the current PR revision's complete CI result as the engineering merge gate.
The safe staging population is recorded in
[catalog population 2026-09-08](catalog-population-2026-09-08.md). Provide the
production environment/support contact and arrange the ruleset review. Continue
current independent evidence, publication and launch acceptance work after those
inputs. Database population approval is not regulatory sign-off or public launch.
