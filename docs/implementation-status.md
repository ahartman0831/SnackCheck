# Implementation status

Last updated: 2026-08-28
Baseline detail: [`docs/remediation-baseline.md`](remediation-baseline.md)
Plan: [`docs/SnackCheck-Cursor-Master-Build-Plan.md`](SnackCheck-Cursor-Master-Build-Plan.md)
Prior plan: [`docs/SnackCheck-Cursor-Remediation-Build-Plan-v2.md`](SnackCheck-Cursor-Remediation-Build-Plan-v2.md)
Design system: [`docs/design-system.md`](design-system.md)
Review checklist: [`docs/phase-4c-review-checklist.md`](phase-4c-review-checklist.md)

Allowed states only: `COMPLETE` | `PARTIAL` | `BLOCKED` | `NOT STARTED`.

A phase is not complete because interfaces, placeholder pages, or a published-looking seed exist.

## Current work

Master-plan **Phase 4C** is `COMPLETE` on authorized Ubuntu CI. The Phase 0–4 working tree is on `codex/phase-4c-closeout` as PR [#1](https://github.com/ahartman0831/SnackCheck/pull/1). Required jobs `verify`, `database`, and `e2e-webkit` are green on `ad9d7d8` ([run 33204223073](https://github.com/ahartman0831/SnackCheck/actions/runs/33204223073)). P0-5 remains an intentional failure until Phase 6. The PR is open and unmerged.

**Host limitations that remain (proven on CI instead):**

- This Mac still cannot run `supabase db reset` or pgTAP: Docker is not installed.
- Playwright WebKit still cannot be installed here: `Playwright does not support webkit on mac13-arm64`.
- Types in `packages/db-types/src/database.types.ts` were taken from `supabase gen types --local` on the CI `database` job, then committed. They were not generated with `--linked`.

**Carried gates (unchanged):**

- **P0-5 remains red** — forgeable `${id}.*` submission cookie. Owned by Phase 6. CI asserts this test still fails.
- **P0-7 remains `BLOCKED`** — unsigned regulatory review. This session did not publish the Arizona ruleset or approve aliases.

Phases 5–11 are `NOT STARTED`. Stop before Phase 5. Do not merge the pull request until approved.

## Master plan phases

| Phase | Name                                                                                                  | Status        |
| ----- | ----------------------------------------------------------------------------------------------------- | ------------- |
| 0     | Baseline and truthful status                                                                          | `COMPLETE`    |
| 1     | Regulatory fail-closed hardening (`0016`, no production fixture fallback, parser warnings block PASS) | `COMPLETE`    |
| 2     | Public product projection / import (`0017`, search status, approved query, fixture isolation)         | `COMPLETE`    |
| 3     | Rebrand to SnackCheck                                                                                 | `COMPLETE`    |
| 4     | Public UI / design system                                                                             | `COMPLETE`    |
| 4C    | Preserve and close the completed remediation                                                          | `COMPLETE`    |
| 5     | Production-quality barcode camera                                                                     | `NOT STARTED` |
| 6     | Secure ingredient-photo submission pipeline                                                           | `NOT STARTED` |
| 7     | Extraction orchestration, confirmation, and persistence                                               | `NOT STARTED` |
| 8     | Admin operations                                                                                      | `NOT STARTED` |
| 9     | Affiliates                                                                                            | `NOT STARTED` |
| 10    | Observability, PWA, CI                                                                                | `NOT STARTED` |
| 11    | Launch catalog and production deploy                                                                  | `NOT STARTED` |

Phase 4C closeout for this session:

- Logical commits from `docs/phase-4c-review-checklist.md` are on `codex/phase-4c-closeout`. They were not pushed to `main`.
- `scripts/generate-db-types.ts` no longer calls `supabase gen types --linked`. A regression test forbids that flag. CI generates types from a local instance only.
- `verify` runs unit tests except P0-5, then `pnpm test:p0-5-open` so an accidental P0-5 pass fails CI.
- `database` starts local Supabase on `ubuntu-latest`, resets through `0018`, runs pgTAP, generates local types, fails if committed types drift, resets again, and runs pgTAP again. It does not link or push.
- `0018` only fixes publication-guard array appends, child-immutability trigger typing, and `search_path`/`digest` qualification so clone works under a locked search_path. It does not publish AZ-HSA.
- `e2e-webkit` installs Playwright WebKit on Ubuntu and runs `mobile-webkit`.

## Original scaffold inventory

### Repository bootstrap — `PARTIAL`

pnpm monorepo, Next.js 16.3.3, SnackCheck public shell, CI, ADR-0001 exist. This Phase 4C run used Node `v22.22.0`.

### Supabase foundation — `PARTIAL`

`0016`/`0017`/`0018` remain unapplied to production and unexecuted on this host. Ubuntu CI applied them locally, ran pgTAP twice, and regenerated types with `--local`. P0-7 remains a human gate.

### Compliance engine — `PARTIAL`

Unchanged. Search, import, approved browsing, and compliance determinations do not call an LLM.

### Catalog and public pages — `PARTIAL`

Public route architecture is redesigned. Live catalog content still depends on a published ruleset and sourced import.

### Barcode and providers — `PARTIAL`

P0-6 is green via honest manual-entry copy. Camera lookup is not implemented.

### Ingredient pipeline — `PARTIAL`

P0-9 is green via paste-only public copy. P0-5 remains open and is owned by Phase 6.

### Approved, PWA, sharing — `PARTIAL`

Approved browsing, product share, sitemap, and metadata are redesigned. Offline/PWA work is not production-complete.

### Admin — `PARTIAL`

Unchanged operations scaffold. Admin and confirmation routes are noindexed.

### Launch dataset — `BLOCKED`

No fabricated production catalog was imported.

### Observability and rehearsal — `PARTIAL`

CI `verify`, `database`, and `e2e-webkit` are green on PR [#1](https://github.com/ahartman0831/SnackCheck/pull/1) run [33204223073](https://github.com/ahartman0831/SnackCheck/actions/runs/33204223073).

### Production launch — `NOT STARTED`

Not deployed. Domain remains pending via `NEXT_PUBLIC_APP_URL`.

## Command snapshot (Phase 4C closeout)

| Command                               | Result                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                   | Passed                                                                                                      |
| `pnpm lint`                           | Passed                                                                                                      |
| `pnpm typecheck`                      | Passed                                                                                                      |
| `pnpm test:types-policy`              | Passed after removing `--linked`                                                                            |
| `pnpm test:unit`                      | Passed — compliance 38, contracts 3, web 59                                                                 |
| `pnpm test:p0-5-open`                 | Passed — P0-5 still fails as required                                                                       |
| `pnpm test:integration`               | Passed — 2 tests                                                                                            |
| `git diff --check`                    | Clean                                                                                                       |
| `supabase db reset --yes`             | Failed locally — Docker daemon unavailable                                                                  |
| `pnpm exec playwright install webkit` | Failed locally — `Playwright does not support webkit on mac13-arm64`                                        |
| GitHub Actions `verify`               | Passed — [98961038663](https://github.com/ahartman0831/SnackCheck/actions/runs/33204223073/job/98961038663) |
| GitHub Actions `database`             | Passed — [98961038776](https://github.com/ahartman0831/SnackCheck/actions/runs/33204223073/job/98961038776) |
| GitHub Actions `e2e-webkit`           | Passed — [98961038687](https://github.com/ahartman0831/SnackCheck/actions/runs/33204223073/job/98961038687) |

## P0 map after Phase 4C

| ID   | Status  | Notes                                                                             |
| ---- | ------- | --------------------------------------------------------------------------------- |
| P0-1 | Green   | Phase 1 — no production fixture ruleset                                           |
| P0-2 | Green   | Phase 1 — parser warnings cannot PASS                                             |
| P0-3 | Green   | Phase 2 — finished public search cards never emit `ingredientStatus: null`        |
| P0-4 | Green   | Phase 2 — production DB miss is not-found, never labeled fixtures                 |
| P0-5 | Red     | Phase 6 — forgeable `${id}.*` submission cookie. CI asserts this test still fails |
| P0-6 | Green   | Phase 4 — barcode page no longer advertises camera scanning while the flag is off |
| P0-7 | Blocked | Human gate — unsigned regulatory review; do not publish or approve aliases        |
| P0-8 | Green   | Phase 2 — approved catalog uses the live query when Supabase is configured        |
| P0-9 | Green   | Phase 4 — public UI no longer advertises scan/photo while extract is paste-only   |

## Remaining operator tasks

1. Review and approve PR [#1](https://github.com/ahartman0831/SnackCheck/pull/1). Do not merge until you explicitly authorize merge.
2. Do not apply `0016`/`0017`/`0018` to the linked production Supabase project.
3. Sign `docs/regulatory-review.md` before calling publish. Do not approve pending aliases.
4. Import sourced products only. Do not invent catalog rows.
5. Do not start Phase 5 until this Phase 4C result is approved.
