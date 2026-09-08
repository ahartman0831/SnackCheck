# SnackCheck web application

Next.js App Router frontend, public API and private reviewer workspace.

Follow the [workspace setup](../../README.md). Environment variables belong in
`apps/web/.env.local` for this application. `AGENTS.md` identifies the installed
Next.js documentation that must be checked before changing framework behavior.

- `app`: public/admin pages and API route handlers.
- `components`: accessible UI, manual/photo confirmation and admin controls.
- `lib/products`, `lib/rules`: public data and deterministic evaluation inputs.
- `lib/ai`: bounded extraction with confirmed text and usage accounting.
- `lib/catalog-*`: private operator evidence acquisition and comparison.
- `lib/supabase`: separate browser, signed-user and server-privileged boundaries.
- `proxy.ts`: refresh reviewer cookies before rendering; authorization remains in
  page/route guards and SQL transactions.
- `tests`: unit and real-storage integration tests; workspace `tests/e2e` contains
  Playwright flows.

Do not enable development catalog fixtures in production or substitute AI output
for a ruleset decision. See [current status](../../docs/implementation-status.md).
