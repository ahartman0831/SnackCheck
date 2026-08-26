import "server-only";
import { env } from "@/lib/env";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
}

export interface RateLimiter {
  limit(key: string, max: number, windowMs: number): Promise<RateLimitResult>;
}

const memory = new Map<string, { count: number; resetAt: number }>();

export const memoryRateLimiter: RateLimiter = {
  async limit(key, max, windowMs) {
    const now = Date.now();
    const current = memory.get(key);
    if (!current || current.resetAt < now) {
      memory.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: max - 1 };
    }
    current.count += 1;
    return { success: current.count <= max, remaining: Math.max(0, max - current.count) };
  },
};

export async function getRateLimiter(): Promise<RateLimiter> {
  if (env.NODE_ENV === "production") {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error("Production rate limiting requires Upstash Redis.");
    }
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
    });
    return {
      async limit(key) {
        const result = await limiter.limit(key);
        return { success: result.success, remaining: result.remaining };
      },
    };
  }
  return memoryRateLimiter;
}
