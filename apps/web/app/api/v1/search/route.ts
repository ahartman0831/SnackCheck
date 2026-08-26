import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { recordEvent } from "@/lib/analytics/events";
import { searchProducts } from "@/lib/products/repository";
import { getRateLimiter } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const id = requestId();
  const limiter = await getRateLimiter();
  const limited = await limiter.limit("search:public", 60, 60_000);
  if (!limited.success) {
    return NextResponse.json(
      fail("RATE_LIMITED", "Too many searches. Try again shortly.", {
        retryable: true,
        id,
      }),
      {
        status: 429,
      },
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").replace(/[\u0000-\u001F]/g, "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      fail("INVALID_QUERY", "Type at least two characters.", { id }),
      { status: 400 },
    );
  }
  if (q.length > 80) {
    return NextResponse.json(fail("INVALID_QUERY", "That search is too long.", { id }), {
      status: 400,
    });
  }

  const results = await searchProducts(q);
  await recordEvent({
    name: results.length === 0 ? "search_zero_results" : "search_performed",
    properties: { queryLength: q.length, resultCount: results.length },
  });
  return NextResponse.json(ok(results, id));
}
