import { describe, expect, it, vi } from "vitest";
import {
  buildServerErrorRecord,
  recordServerError,
} from "@/lib/observability/server-errors";

describe("Phase 10 server observability", () => {
  it("records only allowlisted operational fields", () => {
    const secret = "private-provider-value-never-log-this";
    const error = Object.assign(new Error(secret), {
      digest: "safe-digest-123",
      ingredientText: secret,
    });

    const record = buildServerErrorRecord({
      requestId: "request-1",
      route: "/api/v1/submissions/[id]/extract",
      method: "post",
      error,
      now: new Date("2026-08-30T20:00:00.000Z"),
      environment: "preview",
      release: "abc123",
    });

    expect(record).toEqual({
      timestamp: "2026-08-30T20:00:00.000Z",
      level: "error",
      event: "server_request_error",
      requestId: "request-1",
      route: "/api/v1/submissions/_id_/extract",
      method: "POST",
      errorCode: "UNHANDLED_SERVER_ERROR",
      digest: "safe-digest-123",
      environment: "preview",
      release: "abc123",
    });
    expect(JSON.stringify(record)).not.toContain(secret);
    expect(record).not.toHaveProperty("message");
    expect(record).not.toHaveProperty("stack");
  });

  it("writes one parseable JSON line without raw thrown content", () => {
    const write = vi.fn();
    recordServerError(
      {
        requestId: "request 2",
        route: "/products?private=value",
        method: "GET\nINJECT",
        error: new Error("private ingredient text"),
        environment: "unexpected",
      },
      write,
    );

    expect(write).toHaveBeenCalledOnce();
    const output = write.mock.calls[0]?.[0] as string;
    expect(() => JSON.parse(output)).not.toThrow();
    expect(output).not.toContain("private ingredient text");
    expect(output).not.toContain("\n");
    expect(JSON.parse(output)).toMatchObject({
      requestId: "request_2",
      environment: "unknown",
      errorCode: "UNHANDLED_SERVER_ERROR",
    });
  });
});
