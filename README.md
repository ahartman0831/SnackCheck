# SnackCheck

SnackCheck helps Arizona parents and school staff inspect packaged-food ingredients
before bringing food to school. The first release is an ingredient-screening beta:
paste the full label, confirm it, and see listed restrictions or a VERIFY result.
Search and barcode lookup remain available as the reviewed catalog grows.

The engineering release candidate is prepared in PR #22 directly against main.
Public launch still requires reviewed published rules, configured production
operations and owner approval. The owner deferred the 50-product catalog until
after this beta; development examples never become production product data.

## Start here

- [Takeover audit](docs/SNACKCHECK_TAKEOVER_AUDIT.md): product, architecture and priorities.
- [Implementation status](docs/implementation-status.md): current evidence and blockers.
- [Definition of done](docs/DEFINITION_OF_DONE.md): release acceptance.
- [Launch runbook](docs/launch-runbook.md): environments and release procedure.
- [Test matrix](docs/TEST_MATRIX.md): workflows and verification coverage.

## Local development

Use Node 22.23.2 (`.nvmrc`), pnpm 10.33.0, Supabase CLI 2.84.2 and Docker.

```bash
nvm use
pnpm install --frozen-lockfile
cp .env.example apps/web/.env.local
supabase start
supabase db reset
pnpm dev
```

Next.js loads `apps/web/.env.local`, not the repository-root `.env.local`. Fill the
local Supabase URL, publishable key and service-role key from `supabase status`.
Keep the service key server-side. Generate separate random secrets of at least 32
characters for `SUBMISSION_TOKEN_SECRET` and `ANONYMOUS_KEY_HMAC_SECRET`.
Never paste operational key values into issues, logs or documents.

Without Supabase, the public shell and honest unavailable states render. With local
Supabase, pasted submissions can be checked and reviewed. The seed has no invented
products and its ruleset is unpublished: VERIFY is expected until a qualified review
and authorized publication. AI/camera/photo flags default off; no model key is needed
for the initial manual flow. Scripts consume their process environment; root env files
are operator inputs and are not automatically loaded by Next.js or every script.

Do not run `supabase db reset` against valuable data. Use an isolated project ID and
ports when another local application already uses the default Supabase ports. Never
use `--linked` type generation or a hosted reset for testing.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:types-policy
pnpm test:db
pnpm build
pnpm test:e2e
```

Install Playwright browsers with `pnpm --filter web exec playwright install` on a
supported OS. `pnpm test:e2e:database` requires explicit **local** Supabase credentials
and a built app; see the test matrix. Standard browser tests check unconfigured
states; database browser tests exercise real persisted submissions and auth.

`pnpm --filter web exec next build --webpack` is a supported diagnostic build when a
restricted host prevents Turbopack's helper process from binding a port. It does not
replace the default build gate in Linux CI. Do not disable failed tests to claim a
release. On constrained machines use `pnpm --filter web exec vitest run --maxWorkers=2`.

## Integrations and scope

Supabase owns data, private storage and admin email OTP. Upstash is required for
production abuse protection. Open Food Facts is an optional exact-barcode fallback;
USDA/OFF/permitted manufacturer sources feed a separate private evidence pipeline.
OpenAI and Gemini are optional transcribers, with validation, confirmation and spend
controls. Sentry is optional and receives allowlisted technical fields only.

`SUPPORT_EMAIL` supplies the support page contact at build time. Production requires
real SMTP, support, monitoring, retention and backup/rollback verification. Amazon
Associates monetization is intended but not active; no commissions affect results.
Current feature boundaries and external approvals are documented in the audit.

Ordinary users need no account. Only active admin roles can review evidence and
perform protected changes. Consumer accounts, personal history, nationwide coverage
and full offline/PWA behavior are intentionally deferred.
