# SnackCheck takeover audit

Recorded September 8, 2026. Starting revision: `790c9ce`, branch
`codex/phase-11-evidence-collection`. This document supersedes historical phase
lists for prioritization; preserve those lists as evidence of past decisions.
Current verification and outstanding gates are in `implementation-status.md`.

## Product reconstructed from code

SnackCheck helps Arizona parents and school staff check packaged ingredients before
bringing food to school. The primary questions are “Can I bring this?” and “What
can I bring?” A visitor searches or enters a barcode, inspects evidence and the
separate ingredient/applicability/local-policy results, or confirms a complete
ingredient list. Returning visitors can repeat a check, follow a product link, and
reuse a tab-local draft. Ordinary-user accounts, saved history and payments do not
exist and are not prerequisites for this utility.

Deterministic rules, not AI, decide results. Missing rules, unreviewed evidence,
stale evidence and conflicts must not become PASS. A usable beta requires a signed
published ruleset and a genuinely sourced catalog (existing target: 50 products).
Amazon affiliate monetization remains intended, independently gated commercial
work; it must never influence compliance, catalog eligibility or ranking.

## A. Current architecture

- pnpm monorepo: Next.js 16.3.3 / React 19 App Router in `apps/web`; shared Zod
  contracts, pure compliance engine and generated database types in `packages`.
- Supabase PostgreSQL, 36 forward migrations, private image storage, email OTP
  for administrators. No public customer signup flow. Browser, cookie-user and
  privileged clients serve distinct trust boundaries and should remain separate.
- Public API routes use server-side repositories and restricted SQL projections.
  Admin writes use role-checked transactions, optimistic versions and audit logs.
- Photo pipeline signs anonymous ownership tokens, sanitizes images, transcribes
  through `lib/ai`, requires confirmation and records usage. Gemini and OpenAI
  adapters exist; optional flags and database kill switches guard activation.
- Catalog acquisition is a separate operator pipeline: USDA candidates, relevance
  assessment, permitted OFF/manufacturer evidence, dossiers and AI comparisons.
  Evidence collection does not itself publish products.
- Vercel is the documented host. Upstash supplies production abuse limits;
  optional Sentry and structured server logs diagnose failures. GitHub Actions
  runs code checks, disposable database tests and mobile WebKit. Synthetic health
  checks depend on explicitly configured external target and token.
- Affiliate destinations, tracking IDs, retailer tables and checkout are absent.
  Disclosure pages accurately describe the inactive commercial layer.

## B. Existing working foundation

Baseline lint and workspace typecheck pass. All 74 web unit files / 259 tests pass,
plus compliance and contracts tests. Two API integration files / four tests pass;
the two real-storage assertions are opt-in and were not exercised by that command.
Coverage includes parser ambiguity, ruleset hashes, unpublished-rule failure,
submission ownership, image sanitization, admin roles, stale-edit rejection,
evidence collection constraints and AI schema/fallback/cost behavior.

Production deliberately rejects the development fixture catalog. Rule seed is
unpublished and contains no invented launch products. RLS revokes public table
access, and public products use restricted projections. Database tests cover these
boundaries, but must be rerun against this revision before claiming verification.

## C. Partial implementations

- Catalog: sophisticated staging tooling but no verified launch inventory in the
  repository. Earlier staging counts are historical reports, not fresh read-back.
- Rules: sourced draft and protected review/publish lifecycle; reviewer sign-off
  remains absent. Software cannot substitute for that authorization.
- Photo/camera: meaningful implementation and tests, but flags are off for public
  launch; physical-device and provider acceptance remain incomplete.
- Operations: health, retention and recovery scripts exist; production SMTP,
  alert destinations, restore/rollback exercise and owner-controlled production
  environment remain to be verified.
- Legal/support: information pages exist; support has no actual contact channel,
  and privacy/retention wording requires review against enabled production behavior.

## D. Confirmed defects and remediation priorities

- **P1 abuse/cost:** `lib/rate-limit/index.ts` hardcodes 30 requests/minute in
  production and ignores `max`/`windowMs`. An intended 3/hour sanitization limit
  becomes 30/minute. Search, uploads and barcode lookups also share one bucket per
  endpoint across every visitor. Redis default timeout can permit requests.
- **P1 authentication:** cookie server client writes during Server Component
  rendering; no proxy refresh boundary exists. Expiring reviewer sessions can
  throw or fail to persist refreshed cookies.
- **P1 privacy:** analytics uses a SHA256 concatenation instead of HMAC and silently
  uses a public development secret even in production. All callers currently use
  the same default identity; do not present this as unique-user analytics.
- **P1 journey/reliability:** pasted ingredients unnecessarily require a persisted
  submission even though `/api/v1/evaluations` offers a deterministic unconfirmed
  check. Browser storage denial can throw while rendering or typing. Intake accepts
  malformed metadata as an empty request. Database errors often appear as an empty
  catalog instead of a diagnosable outage.
- **P1 evidence quality:** the engine does not flag a missing verification date on
  an otherwise verified formulation; future dates can also evade age checks.
  Public approved SQL gates are stricter, producing potentially inconsistent detail
  and discovery results. Add adversarial coverage before repair.
- **P2 duplication:** unused `lib/vision` retains the older OpenAI path without the
  active orchestrator's schema, retention and budget protections. Remove after
  confirming no live references. The web database-types file is a re-export, not a
  competing schema. Provider lookup and operator evidence collection have distinct
  purposes; preserve their separate policies.
- **P2 operations:** in-process provider cache and development limiter are unbounded;
  provider failures are cached as long as successful data. Limit memory and avoid
  freezing temporary outages for twelve hours.

## E. Architecture and scope decisions

KEEP: monorepo, pure engine, shared contracts, migrations, three Supabase client
roles, restricted projections, admin transactions and provenance trail.

REPAIR: rate limits, session refresh, privacy defaults, error visibility, evidence
date gates, supported local setup and misleading successful/empty responses.

COMPLETE: tested primary journey, production readiness verification and actual
support configuration. Launch inventory and ruleset publication require real
evidence and external review, not more UI scaffolding.

CONSOLIDATE: obsolete vision adapter, documentation authority and runtime guidance.

DEFER: consumer accounts/history, school policy management, full PWA, nationwide
coverage, native apps, large-scale automatic catalog promotion and unvalidated AI
providers. Keep their useful schema/history; do not delete data.

Affiliate implementation should be the smallest independent module when approved
destinations and Associates tracking ID exist. Do not fabricate ASINs or retailer
matches. Enablement needs visible disclosure and owner legal/account approval.

## F. Security and secret review

Priority is abuse protection, session correctness and truthful failure states.
Privileged keys are read by server-only clients, with no discovered intended client
exposure. The checked-in example contains names, not operational secrets. Local
environment and Vercel files are ignored and were not printed. Existing CI secret
scan covers only a few patterns and excludes docs; history needs a redacted scan.
Findings from history and dependency advisories must be recorded in status without
including credentials. No inference that a scanned repository is immune to leaks.

Public inputs generally use Zod; authorization is rechecked at routes and SQL RPCs.
Submission IDs require signed ownership, not UUID secrecy. Signed image paths,
service-role evidence runners, source allowlists, request bounds and cost ledgers
are valuable controls to retain. AI SDK retries need review against ledger budgets.

## G. Database audit

Schema authority is `supabase/migrations`, generated types are in `packages/db-types`.
Important table families and their ownership/retention:

- `jurisdictions`, `regulatory_sources`, `rulesets`, `ruleset_contexts`,
  `prohibited_substances`, `rule_aliases`: regulatory-admin controlled, sourced and
  versioned with hashes. Preserve published history; publication locks prevent edits.
- `products`, `product_identifiers`, `product_aliases`, `product_redirects`:
  canonical catalog identity, unique GTIN/slug constraints and safe duplicate merge.
  `formulations`, `formulation_sources`, `formulation_ingredients` preserve evidence
  and revisions. Keep historical evidence; deactivate instead of deleting products.
- `compliance_evaluations`, `evaluation_matches`: rule/formulation-specific derived
  results; public eligibility also checks freshness/conflicts and current rules.
- `submissions`, `evidence_assets`, `data_conflicts`: private user evidence, signed
  ownership, retained sanitized derivatives, review/version constraints and cleanup.
  Raw and sanitized storage are private. Deployment must actually schedule retention.
- `admin_members`, `admin_audit_log`: active roles and durable action history.
  Authentication alone grants no reviewer rights.
- `provider_cache`, `analytics_events`, `application_settings`: operational data.
  Runtime barcode cache currently uses process memory rather than `provider_cache`;
  classify that table as dormant, retain until retention/consolidation is decided.
- `submission_daily_counters`, `ai_extraction_daily_counters`,
  `extraction_attempts`, `ai_model_pricing`, `ai_usage_ledger`: abuse/spend records;
  atomic reservations and pricing controls, no need for private prompt content.
- `catalog_import_batches`, `catalog_source_records`, relevance/shortlist tables,
  `catalog_evidence_*` runs, candidates, attempts, counters and dossiers: private
  operator staging with unique/idempotency constraints and candidate foreign keys.
  Migration 0036 is documented as not yet applied to staging; never assume parity.
- `districts`, `schools`, `school_program_participation`, `local_policies`: supporting
  jurisdiction context, intentionally deferred administration. Preserve existing data.

Forward migrations include RLS, indexes, restricted security-definer functions and
transactional gates. Repeated clean reset, pgTAP and generated-type comparison are
the release evidence required. No destructive production operation is authorized.
Known query concerns: ruleset loader fetches aliases across versions; several
read errors are swallowed; admin lists are bounded, while catalog jobs use explicit
batch caps. Revisit indexing using actual query plans once launch data exists.

## H. UX review

Public shell, search, barcode/manual entry, ingredients, results, discovery, legal,
offline and reviewer screens exist. Fixtures are labeled and production-disabled.
Empty/unavailable rulesets are honest, but cannot deliver the intended useful
launch result. Package-change intake and missing-product requests need real evidence
review; neither should imply automatic publication. Check desktop/mobile, storage
denial, double submission, slow network, provider failure and expired sessions.

## I. Deployment and verification concerns

Shell currently selects Node 20 although package requires 22+. Installed Node 22.23.2
is available. Default Turbopack build hits a host helper-port restriction even with
escalated execution; test webpack separately, retain default build CI gate. Local
Supabase is not running for this project; another product's database is running
and must remain untouched. Use isolated project/ports for disposable tests.

No public launch, paid provider run, rules publication, production data mutation or
external message is part of this local stabilization. Production go-live remains
owner controlled. User's takeover authorization permits ordinary local fixes and
verification without the old roadmap's per-slice stop requirement.

## J. Dependency order

1. P0: resolve any failed migrations, exposed privileged secrets or evidence that
   unreviewed data becomes PASS. Do not invent a P0 when none is reproduced.
2. P1: repair abuse limits, auth refresh, evidence-date safety and primary workflow;
   add regression tests and verify code/build/browser/database boundaries.
3. P1: actual catalog + signed rules + production services/support/legal review,
   dependent on evidence and owner-controlled accounts/approval.
4. P2: bounded caches, duplicate removal, honest errors/analytics and documentation.
5. P3: optional monetization expansion, personalization and advanced automation.

The project is not production-ready until the external product/data gates and
`DEFINITION_OF_DONE.md` are satisfied, regardless of passing tests.
