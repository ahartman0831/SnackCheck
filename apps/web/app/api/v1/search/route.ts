import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { recordEvent } from "@/lib/analytics/events";
import { clampSearchLimit, normalizeSearchQuery } from "@/lib/products/search-query";
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
  const parsed = normalizeSearchQuery(url.searchParams.get("q") ?? "");
  if ("error" in parsed) {
    return NextResponse.json(
      fail(
        "INVALID_QUERY",
        parsed.error === "too_long"
          ? "That search is too long."
          : "Type at least two characters.",
        { id },
      ),
      { status: 400 },
    );
  }

  const results = await searchProducts(parsed.query, {
    limit: clampSearchLimit(Number(url.searchParams.get("limit") ?? 24)),
    offset: Math.max(Number(url.searchParams.get("offset") ?? 0), 0),
    cursorId: url.searchParams.get("cursorId") ?? undefined,
    cursorRank: url.searchParams.get("cursorRank")
      ? Number(url.searchParams.get("cursorRank"))
      : undefined,
    cursorName: url.searchParams.get("cursorName") ?? undefined,
  });
  await recordEvent({
    name: results.length === 0 ? "search_zero_results" : "search_performed",
    properties: { queryLength: parsed.query.length, resultCount: results.length },
  });
  return NextResponse.json(ok(results, id));
}
