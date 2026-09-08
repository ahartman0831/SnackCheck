import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { fail } from "@/lib/api/envelope";
import { getRateLimiter } from "@/lib/rate-limit";

export function publicRateLimitKey(request: Request, scope: string): string {
  // Vercel overwrites this header. Never trust arbitrary forwarded headers on
  // another host; deployments there must supply an equivalent trusted adapter.
  const forwarded =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : undefined;
  const identity = forwarded && isIP(forwarded) ? forwarded : "shared";
  const secret = env.ANONYMOUS_KEY_HMAC_SECRET ?? env.SUBMISSION_TOKEN_SECRET;
  if (env.NODE_ENV === "production" && !secret) {
    throw new Error("Rate limiting requires an anonymous identity secret.");
  }
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHmac("sha256", secret ?? "local-rate-limit-only")
    .update(`${scope}:${day}:${identity}`)
    .digest("hex");
  return `${scope}:${hash}`;
}

export async function enforceRateLimit(input: {
  request: Request;
  scope: string;
  max: number;
  windowMs: number;
  requestId: string;
  ownedResourceId?: string;
}): Promise<NextResponse | null> {
  try {
    const key = input.ownedResourceId
      ? `${input.scope}:${input.ownedResourceId}`
      : publicRateLimitKey(input.request, input.scope);
    const limiter = await getRateLimiter();
    const result = await limiter.limit(key, input.max, input.windowMs);
    if (result.success) return null;
    if (!result.unavailable) {
      return NextResponse.json(
        fail("RATE_LIMITED", "Too many requests. Please try again shortly.", {
          retryable: true,
          id: input.requestId,
        }),
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(input.windowMs / 1000)) },
        },
      );
    }
  } catch {
    // Configuration and provider outages use the same safe public envelope.
  }
  return NextResponse.json(
    fail(
      "TEMPORARILY_UNAVAILABLE",
      "This operation is temporarily unavailable. Please try again shortly.",
      {
        retryable: true,
        id: input.requestId,
      },
    ),
    { status: 503, headers: { "Retry-After": "30" } },
  );
}
