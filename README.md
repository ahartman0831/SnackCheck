# SnackCheck

Arizona Healthy Schools Act food compliance checker.

Scan it. Search it. Know before you bring it.

Formerly branded _Can I Bring This?_ during the initial scaffold. Current public branding is SnackCheck.

## Prerequisites

- Node.js 22+ (`engines.node`; GitHub Actions uses Node 22). No nvm/fnm/Volta pin is checked in
- pnpm 10.33.0
- Supabase CLI (Phase 1+): `supabase` on `PATH`
- Docker (for local Supabase)

## Setup

```bash
pnpm install
cp .env.example .env.local
```

The public shell renders without product data. Set `NEXT_PUBLIC_APP_URL` to the deployed origin when one is confirmed. Development defaults to `http://localhost:3000`.

### Later phases

```bash
supabase start
supabase db reset
pnpm db:types
pnpm dev
```

## Commands

| Command                | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `pnpm dev`             | Next.js app at http://localhost:3000                      |
| `pnpm lint`            | ESLint                                                    |
| `pnpm typecheck`       | TypeScript across the workspace                           |
| `pnpm test`            | Unit tests (P0-5 is an intentional failure until Phase 6) |
| `pnpm test:unit`       | Unit tests excluding the open P0-5 gate                   |
| `pnpm test:p0-5-open`  | Confirms P0-5 is still red                                |
| `pnpm test:e2e`        | Playwright (Chromium and WebKit)                          |
| `pnpm test:e2e:webkit` | Playwright mobile WebKit                                  |
| `pnpm test:db`         | Local Supabase pgTAP                                      |
| `pnpm build`           | Production build                                          |
| `pnpm format`          | Prettier                                                  |

## Principles

AI extracts. Rules decide. Sources prove. Database remembers.

The application never invents product ingredients or marks uncertain evidence as PASS.
