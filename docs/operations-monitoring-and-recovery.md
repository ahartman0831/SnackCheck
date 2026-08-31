# Monitoring and recovery runbook

## Current safety boundary

Production barcode camera, ingredient photo, AI extraction, affiliates, and ruleset publication remain off. The operational work in Phase 10 does not change production data or enable those features.

## Error monitoring

SnackCheck always writes a structured, allowlisted server-error record to the platform log. If `SENTRY_DSN` is configured, the same safe record is sent to Sentry as a message event. The monitoring SDK is initialized without default integrations, tracing, request capture, user data, breadcrumbs, or exception serialization. Ingredient text, images, headers, query strings, tokens, raw error messages, and stacks are not sent.

Before enabling a Sentry destination:

1. Create separate preview and production Sentry projects or environments.
2. Set `SENTRY_DSN` only in the matching Vercel environment.
3. Trigger a controlled synthetic server error in preview and confirm the event contains only the documented tags.
4. Configure alerts for a new `UNHANDLED_SERVER_ERROR`, repeated route failures, and missing events from the scheduled synthetic monitor.
5. Record the project owner and alert recipient below. Do not enable production monitoring until that human routing is verified.

- Monitoring owner: **unassigned**
- Alert recipient: **unassigned**

## Synthetic health checks

`GET /api/health` proves that the application process can answer without exposing dependencies or admin data. `GET /api/internal/health` requires the 32+ character `SYNTHETIC_MONITOR_TOKEN` bearer token and verifies:

- Supabase can be queried;
- the photo and AI database kill switches are stopped;
- production camera/photo feature flags remain off.

The GitHub `Synthetic health` workflow runs every 15 minutes only after both of these are configured:

- repository variable `SYNTHETIC_BASE_URL`;
- repository secret `SYNTHETIC_MONITOR_TOKEN`, matching the server-only Vercel value.

Until then, the workflow reports that monitoring is inactive and does not pretend the app is covered. The runner checks the home page, public health, manual barcode page, privacy page, the unauthenticated admin boundary, and protected readiness. It never creates a submission, invokes an AI provider, or sends product/ingredient data.

## Retention cleanup

The cleanup command is dry-run by default:

```text
pnpm ops:retention
```

It considers only expired submissions that are unlinked to a product and already terminal (`FAILED`, `CANCELLED`, or `REJECTED`). It does not purge approved/package evidence, active review work, or product-linked evidence. Apply mode additionally requires both:

```text
RETENTION_CLEANUP_APPLY=true
RETENTION_CLEANUP_CONFIRM=DELETE_EXPIRED_UNLINKED_TERMINAL_SUBMISSIONS
```

The worker deletes private raw/sanitized objects before clearing their database pointers and removing the expired evidence record. It emits counts only, never object paths, submission IDs, ingredient text, or storage errors. A storage failure leaves the database pointers intact for a safe retry. Run dry-run first, review the count, then run one small batch. Scheduling remains off until staging observation confirms the policy.

## Backup and restore

CI performs a real data backup/restore rehearsal against disposable local Supabase. It inserts a non-sensitive analytics marker, dumps the table with PostgreSQL tooling from the local container, clears it, restores the dump, verifies the marker, and then performs the normal second database reset. It never connects to linked staging or production.

Production backup/restore is not yet rehearsed. Before launch:

1. Confirm Supabase backups and retention for the production plan.
2. Restore the latest backup into a separate non-production project.
3. Run migrations, pgTAP, generated-type comparison, private-storage checks, and a sourced product/evaluation sample.
4. Record recovery point, elapsed recovery time, operator, project, and outcome.
5. Destroy the temporary restore project only after the evidence is recorded.

## Vercel rollback

For a preview rehearsal, deploy a deliberately labeled harmless docs-only commit, keep the previous immutable deployment URL, and verify both versions. Do not promote either deployment to production. A production rollback remains a human launch gate:

1. Stop camera/photo/AI flags and provider calls first.
2. Select the previous known-good Vercel deployment.
3. Verify `/api/health`, `/api/internal/health`, home, manual barcode, rules fail-closed behavior, and admin authentication.
4. Never roll database migrations backward. Ship a reviewed forward migration if schema repair is required.
5. Record the release SHAs, timestamps, operator, reason, checks, and outcome.

## Incident ownership

- Product owner: **Alex Hartman**
- Technical operator: **unassigned**
- Regulatory reviewer: **unassigned**
- Backup/restore operator: **unassigned**
