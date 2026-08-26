# ADR-0002: Local Supabase is optional until Docker is available

**Status:** Accepted  
**Date:** 2026-08-26

## Context

Phase 1 requires `supabase db reset` twice. This environment does not have a running Docker daemon.

## Decision

Commit the full migration set and treat Docker reset as a required local/CI step when Docker is present. The web app uses the service-role client when configured and otherwise falls back to:

- the in-package Arizona ruleset snapshot for evaluation;
- an explicit `DEV_CATALOG_ENABLED` fixture catalog that is never loaded in production.

## Consequences

CI should run `supabase db reset` on runners with Docker. Developers without Docker can still run the public shell and the deterministic engine.
