import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ limit: vi.fn(), window: vi.fn(), options: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "production",
    UPSTASH_REDIS_REST_URL: "https://redis.test",
    UPSTASH_REDIS_REST_TOKEN: "test",
    ANONYMOUS_KEY_HMAC_SECRET: "a".repeat(32),
  },
}));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = mocks.window;
    constructor(options: unknown) {
      mocks.options(options);
    }
    limit = mocks.limit;
  },
}));

import { getRateLimiter, memoryRateLimiter } from "@/lib/rate-limit";
import { enforceRateLimit, publicRateLimitKey } from "@/lib/rate-limit/request";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("production abuse boundaries", () => {
  it("uses the actual sanitization and search budgets in separate namespaces", async () => {
    mocks.limit.mockResolvedValue({ success: true, remaining: 2 });
    const limiter = await getRateLimiter();
    await limiter.limit("sanitize:one", 3, 3_600_000);
    await limiter.limit("search:one", 60, 60_000);
    expect(mocks.window.mock.calls).toEqual([
      [3, "3600000 ms"],
      [60, "60000 ms"],
    ]);
    expect(mocks.options.mock.calls.map(([options]) => options.prefix)).toEqual([
      "snackcheck:rate:3:3600000",
      "snackcheck:rate:60:60000",
    ]);
  });
  it.each(["timeout", "throw"])("fails closed on Redis %s", async (failure) => {
    if (failure === "timeout")
      mocks.limit.mockResolvedValue({ success: true, reason: "timeout" });
    else mocks.limit.mockRejectedValue(new Error("private upstream details"));
    const response = await enforceRateLimit({
      request: new Request("https://snack.test"),
      scope: "upload",
      max: 6,
      windowMs: 60_000,
      requestId: "test",
    });
    expect(response?.status).toBe(503);
    expect(await response?.text()).not.toContain("private upstream");
  });
  it("separates visitors only using a trusted platform header and never stores raw IPs", () => {
    const one = new Request("https://snack.test", {
      headers: { "x-vercel-forwarded-for": "192.0.2.1" },
    });
    const two = new Request("https://snack.test", {
      headers: { "x-vercel-forwarded-for": "192.0.2.2" },
    });
    expect(publicRateLimitKey(one, "search")).toBe(publicRateLimitKey(two, "search"));
    vi.stubEnv("VERCEL", "1");
    expect(publicRateLimitKey(one, "search")).not.toBe(publicRateLimitKey(two, "search"));
    expect(publicRateLimitKey(one, "search")).not.toContain("192.0.2");
  });
  it("resets a local bucket exactly at its boundary", async () => {
    vi.useFakeTimers();
    expect((await memoryRateLimiter.limit("boundary-test", 1, 1000)).success).toBe(true);
    expect((await memoryRateLimiter.limit("boundary-test", 1, 1000)).success).toBe(false);
    vi.advanceTimersByTime(1000);
    expect((await memoryRateLimiter.limit("boundary-test", 1, 1000)).success).toBe(true);
  });
});
