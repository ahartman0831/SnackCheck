import { catalogUnavailable } from "@/lib/api/unavailable";
import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { normalizeGtin } from "@/lib/gtin";
import { lookupGtin } from "@/lib/providers/provider-chain";
import { enforceRateLimit } from "@/lib/rate-limit/request";

export async function GET(
  request: Request,
  context: { params: Promise<{ gtin: string }> },
) {
  const id = requestId();
  const rateLimit = await enforceRateLimit({
    request,
    scope: "upc",
    max: 30,
    windowMs: 60000,
    requestId: id,
  });
  if (rateLimit) return rateLimit;

  const { gtin } = await context.params;
  const normalized = normalizeGtin(gtin);
  if ("error" in normalized) {
    return NextResponse.json(fail("INVALID_GTIN", normalized.error, { id }), {
      status: 400,
    });
  }

  try {
    const lookup = await lookupGtin(normalized.gtin14);
    return NextResponse.json(ok({ gtin: normalized, lookup }, id));
  } catch (error) {
    return catalogUnavailable(error, id, "/api/v1/upc/[gtin]");
  }
}
