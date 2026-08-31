import { describe, expect, it } from "vitest";
import { buildMonitoringEvent } from "@/lib/observability/error-monitoring";
import { buildServerErrorRecord } from "@/lib/observability/server-errors";

describe("Phase 10 error monitoring boundary", () => {
  it("creates a monitor event from allowlisted metadata only", () => {
    const privateValue = "private ingredient and provider value";
    const record = buildServerErrorRecord({
      requestId: "request-7",
      route: "/api/v1/submissions/[id]/extract",
      method: "POST",
      error: new Error(privateValue),
      now: new Date("2026-08-31T12:00:00.000Z"),
      environment: "preview",
      release: "release-7",
    });

    const event = buildMonitoringEvent(record);
    const serialized = JSON.stringify(event);

    expect(event).toMatchObject({
      message: "UNHANDLED_SERVER_ERROR",
      environment: "preview",
      release: "release-7",
      tags: {
        request_id: "request-7",
        route: "/api/v1/submissions/_id_/extract",
        method: "POST",
      },
    });
    expect(serialized).not.toContain(privateValue);
    expect(event).not.toHaveProperty("exception");
    expect(event).not.toHaveProperty("request");
    expect(event).not.toHaveProperty("user");
    expect(event).not.toHaveProperty("breadcrumbs");
  });
});
