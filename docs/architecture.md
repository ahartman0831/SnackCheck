# Architecture

SnackCheck is a consumer utility that applies a versioned Arizona ruleset to a versioned product formulation. The initial scaffold used the working title _Can I Bring This?_; that name is historical only.

**AI extracts. Rules decide. Sources prove. Database remembers.**

## Layout

| Path                  | Responsibility                               |
| --------------------- | -------------------------------------------- |
| `apps/web`            | Next.js App Router, public and admin UI, API |
| `packages/compliance` | Pure TypeScript compliance engine            |
| `packages/contracts`  | Shared Zod schemas and inferred types        |
| `packages/db-types`   | Generated Supabase `Database` types          |
| `supabase/migrations` | Schema authority                             |

## Trust boundaries

- Browser input is untrusted.
- External provider data is untrusted and mapped through Zod.
- Model output is untrusted until schema validation and application constraints pass.
- Only enabled, sourced, effective aliases participate in matching.
- The service-role Supabase client is imported only from server-only modules.
- Admin authentication is not authorization.

## Determinations

The API and database keep three results separate:

1. Ingredient result: `PASS` | `FAIL` | `VERIFY`
2. Applicability result
3. Local-policy result

An LLM never computes these values.
