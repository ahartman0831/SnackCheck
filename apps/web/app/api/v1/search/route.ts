import { catalogUnavailable } from "@/lib/api/unavailable";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { recordEvent } from "@/lib/analytics/events";
import { clampSearchLimit, normalizeSearchQuery } from "@/lib/products/search-query";
import { searchProducts } from "@/lib/products/repository";
import { enforceRateLimit } from "@/lib/rate-limit/request";

export async function GET(request: Request) {
  const id = requestId();
  const rateLimit = await enforceRateLimit({
    request,
    scope: "search",
    max: 60,
    windowMs: 60000,
    requestId: id,
  });
  if (rateLimit) return rateLimit;

  const url = new URL(request.url);
  const pagination = z
    .object({
      offset: z.coerce.number().int().min(0).max(10_000).default(0),
      cursorId: z.string().uuid().optional(),
      cursorRank: z.coerce.number().int().nonnegative().optional(),
      cursorName: z.string().max(300).optional(),
    })
    .safeParse({
      offset: url.searchParams.get("offset") ?? undefined,
      cursorId: url.searchParams.get("cursorId") || undefined,
      cursorRank: url.searchParams.get("cursorRank") || undefined,
      cursorName: url.searchParams.get("cursorName") || undefined,
    });
  if (!pagination.success) {
    return NextResponse.json(
      fail("INVALID_QUERY", "That search page is invalid.", { id }),
      { status: 400 },
    );
  }
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

  try {
    const results = await searchProducts(parsed.query, {
      limit: clampSearchLimit(Number(url.searchParams.get("limit") ?? 24)),
      ...pagination.data,
    });
    await recordEvent({
      name: results.length === 0 ? "search_zero_results" : "search_performed",
      properties: { queryLength: parsed.query.length, resultCount: results.length },
    });
    return NextResponse.json(ok(results, id));
  } catch (error) {
    return catalogUnavailable(error, id, "/api/v1/search");
  }
}
