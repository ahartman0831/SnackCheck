# Can I Bring This?

Arizona Healthy Schools Act food compliance checker.

Scan it. Search it. Know before you bring it.

## Prerequisites

- Node.js 22+
- pnpm 10.33.0
- Supabase CLI (Phase 1+): `supabase` on `PATH`
- Docker (for local Supabase)

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Phase 0 does not require Supabase or API keys. The public shell renders without product data.

### Later phases

```bash
supabase start
supabase db reset
pnpm db:types
pnpm dev
```

## Commands

| Command          | Purpose                                 |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Next.js app at http://localhost:3000    |
| `pnpm lint`      | ESLint                                  |
| `pnpm typecheck` | TypeScript across the workspace         |
| `pnpm test`      | Unit tests                              |
| `pnpm test:e2e`  | Playwright (mobile Chromium and WebKit) |
| `pnpm build`     | Production build                        |
| `pnpm format`    | Prettier                                |

## Principles

AI extracts. Rules decide. Sources prove. Database remembers.

The application never invents product ingredients or marks uncertain evidence as PASS.
