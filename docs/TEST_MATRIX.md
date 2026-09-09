# Critical workflow test matrix

Dated results: `RELEASE_AUDIT.md`. Tests use controlled fixtures or an explicitly
local disposable database; none prove real catalog accuracy or legal sign-off.

- New visitor: homepage, search, barcode fallback, ingredient form, approved page,
  rules, legal/support and not-found routes. Playwright public routes + axe.
- First check: follow the homepage ingredient action, create actual private submission,
  process pasted text, confirm,
  receive truthful VERIFY with unpublished rules. `takeover-journey.spec.ts` uses
  the real local API and database, not intercepted responses.
- Returning visitor: tab-local draft survives reload; link navigation remains usable.
- Input/error recovery: bad checksum, invalid pagination, incomplete/malformed body,
  extraction failure, denied browser storage and network failure. Unit + browser
  regressions verify retained edits and prevent confirming failed extraction.
- Returning reviewer: real local auth session, expired access token, refresh cookies,
  permitted workspace and logout. Temporary reviewer is removed after the test.
- Authorization: unauthenticated admin calls, unrelated submission access, wrong roles,
  stale updates, RLS, private storage and transactional moderation. Browser + pgTAP.
- Evidence: unpublished/mismatched rules, missing/future/stale dates, parser ambiguity,
  provider conflicts and strict discovery eligibility. Engine + pgTAP + route tests.
- Third parties: malformed AI output, timeouts, retry budgets, retained billable usage,
  provider-cache outage recovery and Redis failure. Unit tests; no paid provider call.
- Layout: desktop/mobile Chrome, widths 320–1440px, dark mode, reduced motion, zoom and
  serious/critical accessibility violations. WebKit on supported Linux CI.
- Release approval rehearsal: separate fixture reviewer/publisher, real publication
  and candidate promotion transactions, anonymous eligibility and conflict withdrawal;
  all ten assertions roll back. Actual route/engine tests also prove published-rule
  FAIL and unverified VERIFY; neither fixture constitutes real approval.
- Operations: repeated clean migrations, local generated types, real private image
  processing, retention cleanup and guarded disposable backup/restore.

## Run the real-database browser suite

Use a disposable local Supabase and export its URL, anon/publishable key and service
role key into the shell; never echo the service key. Configure random local test
`SUBMISSION_TOKEN_SECRET` and `ANONYMOUS_KEY_HMAC_SECRET`, set
`VERCEL_ENV=preview`, `ALLOW_PREVIEW_MEMORY_RATE_LIMIT=true`,
`OPEN_FOOD_FACTS_ENABLED=false`, and `PLAYWRIGHT_BASE_URL=https://127.0.0.1:3100`.
Set `NEXT_PUBLIC_APP_URL` to the same HTTPS URL. The test server generates a
one-day certificate and proxies to the local app on port 3101; it requires OpenSSL.
Only the test browser ignores that disposable certificate. Production Secure cookie
flags remain enabled. Keep AI/photo/camera flags off. Build with the same public environment and run:

```bash
pnpm build
pnpm test:e2e:database
```

The dedicated configuration rejects non-local app/database URLs. It has no skipped
journey assertions and runs desktop Chromium plus mobile WebKit. Linux CI performs
this sequence in its disposable database job. The ordinary suite excludes this file
because it intentionally runs without backend credentials.

For an already running production build, set `PLAYWRIGHT_PRODUCTION=true` for the
ordinary suite. It then asserts that development fixtures/gallery are inaccessible.
Existing camera tests require their separate feature-enabled configuration; public
production flags remain off.

Backup rehearsal truncates and restores only its target's analytics table. It now
requires `SNACKCHECK_DISPOSABLE_RESTORE_CONFIRM=DISPOSABLE_LOCAL_ONLY`; set
`SNACKCHECK_DISPOSABLE_DB_CONTAINER` when using an isolated container name. Never
point this rehearsal at data worth retaining.

## Remaining acceptance outside local automation

Physical Android/iPhone camera/photo failure paths when those features are enabled;
actual SMTP email delivery; reviewed real-package sample; production Redis behavior,
alert routing, retention schedule, restore and Vercel rollback; final legal and
regulatory sign-off. A mock provider or local email server cannot verify those.
