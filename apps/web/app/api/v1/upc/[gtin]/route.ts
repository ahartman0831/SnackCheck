import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { normalizeGtin } from "@/lib/gtin";
import { lookupGtin } from "@/lib/providers/provider-chain";
import { getRateLimiter } from "@/lib/rate-limit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ gtin: string }> },
) {
  const id = requestId();
  const limiter = await getRateLimiter();
  const limited = await limiter.limit("upc:public", 30, 60_000);
  if (!limited.success) {
    return NextResponse.json(
      fail("RATE_LIMITED", "Too many lookups.", { retryable: true, id }),
      { status: 429 },
    );
  }

  const { gtin } = await context.params;
  const normalized = normalizeGtin(gtin);
  if ("error" in normalized) {
    return NextResponse.json(fail("INVALID_GTIN", normalized.error, { id }), {
      status: 400,
    });
  }

  const lookup = await lookupGtin(normalized.gtin14);
  return NextResponse.json(ok({ gtin: normalized, lookup }, id));
}
