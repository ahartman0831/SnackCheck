import "server-only";
import { env } from "@/lib/env";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  unavailable?: boolean;
}

export interface RateLimiter {
  limit(key: string, max: number, windowMs: number): Promise<RateLimitResult>;
}

const memory = new Map<string, { count: number; resetAt: number }>();

export const memoryRateLimiter: RateLimiter = {
  async limit(key, max, windowMs) {
    const now = Date.now();
    for (const [storedKey, entry] of memory) {
      if (entry.resetAt <= now) memory.delete(storedKey);
    }
    const current = memory.get(key);
    if (!current || current.resetAt <= now) {
      if (memory.size >= 10_000) return { success: false, remaining: 0 };
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
      if (env.VERCEL_ENV === "preview" && env.ALLOW_PREVIEW_MEMORY_RATE_LIMIT) {
        return memoryRateLimiter;
      }
      throw new Error("Production rate limiting requires Upstash Redis.");
    }
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    return {
      async limit(key, max, windowMs) {
        const limiter = new Ratelimit({
          redis,
          prefix: `snackcheck:rate:${max}:${windowMs}`,
          limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
          timeout: 1500,
          analytics: false,
        });
        try {
          const result = await limiter.limit(key);
          // Upstash returns success on timeout by default. Costly work must stop.
          if (result.reason === "timeout") {
            return { success: false, remaining: 0, unavailable: true };
          }
          return { success: result.success, remaining: result.remaining };
        } catch {
          return { success: false, remaining: 0, unavailable: true };
        }
      },
    };
  }
  return memoryRateLimiter;
}
