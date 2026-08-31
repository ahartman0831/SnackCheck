import type { Event } from "@sentry/nextjs";
import type { ServerErrorRecord } from "@/lib/observability/server-errors";

let configured = false;

export function buildMonitoringEvent(record: ServerErrorRecord): Event {
  return {
    timestamp: Date.parse(record.timestamp) / 1000,
    level: "error",
    message: record.errorCode,
    environment: record.environment,
    release: record.release,
    tags: {
      event: record.event,
      request_id: record.requestId,
      route: record.route,
      method: record.method,
      error_code: record.errorCode,
      ...(record.digest ? { digest: record.digest } : {}),
    },
  };
}

export async function registerErrorMonitoring(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    defaultIntegrations: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      // SnackCheck sends only events assembled from the allowlisted server record.
      // This final filter protects against SDK or future-callsite enrichment.
      delete event.breadcrumbs;
      delete event.contexts;
      delete event.exception;
      delete event.extra;
      delete event.request;
      delete event.server_name;
      delete event.user;
      return event;
    },
  });
  configured = true;
}

export async function reportServerError(record: ServerErrorRecord): Promise<void> {
  if (!configured) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureEvent(buildMonitoringEvent(record));
  await Sentry.flush(1_500);
}
