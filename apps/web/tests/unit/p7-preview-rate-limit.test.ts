import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

async function loadLimiter(overrides: Record<string, unknown>) {
  vi.doMock("@/lib/env", () => ({
    env: {
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
      VERCEL_ENV: undefined,
      ALLOW_PREVIEW_MEMORY_RATE_LIMIT: false,
      ...overrides,
    },
  }));
  return import("@/lib/rate-limit");
}

describe("preview-only in-memory rate limiting", () => {
  it("requires both the Vercel preview environment and the explicit opt-in", async () => {
    const { getRateLimiter, memoryRateLimiter } = await loadLimiter({
      VERCEL_ENV: "preview",
      ALLOW_PREVIEW_MEMORY_RATE_LIMIT: true,
    });

    await expect(getRateLimiter()).resolves.toBe(memoryRateLimiter);
  });

  it("fails closed for a preview without the explicit opt-in", async () => {
    const { getRateLimiter } = await loadLimiter({ VERCEL_ENV: "preview" });

    await expect(getRateLimiter()).rejects.toThrow(
      "Production rate limiting requires Upstash Redis.",
    );
  });

  it("fails closed in production even if the preview opt-in is set", async () => {
    const { getRateLimiter } = await loadLimiter({
      VERCEL_ENV: "production",
      ALLOW_PREVIEW_MEMORY_RATE_LIMIT: true,
    });

    await expect(getRateLimiter()).rejects.toThrow(
      "Production rate limiting requires Upstash Redis.",
    );
  });
});
