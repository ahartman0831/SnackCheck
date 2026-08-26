# ADR-0001: pnpm monorepo layout

**Status:** Accepted  
**Date:** 2026-08-26

## Context

The master build plan lists a single Next.js application at the repository root (`app/`, `lib/`, `components/`). Workspace rules for this product require `apps/*` and `packages/*`, with generated Database types living in `packages/db-types` and a compliance module that cannot import Next.js, Supabase, OpenAI, analytics, or UI code.

## Decision

Initialize the repository as a pnpm workspace:

- `apps/web` — Next.js App Router, public UI, API routes, providers
- `packages/compliance` — deterministic engine
- `packages/contracts` — shared Zod schemas
- `packages/db-types` — canonical generated Database types
- `supabase/` — SQL migrations and database tests at the repository root

`apps/web/lib/database.types.ts` is a thin re-export only.

## Consequences

Route paths from the master plan are unchanged; they live under `apps/web/app/`. Domain boundaries stay stricter than a single-package tree. This is an allowed structural deviation; regulatory and data rules are not changed.
