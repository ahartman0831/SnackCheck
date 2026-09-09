import { NextResponse } from "next/server";
import { fail } from "@/lib/api/envelope";
import { recordServerError } from "@/lib/observability/server-errors";

export function catalogUnavailable(error: unknown, id: string, route: string) {
  recordServerError({
    error,
    requestId: id,
    route,
    method: "GET",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
  return NextResponse.json(
    fail(
      "CATALOG_UNAVAILABLE",
      "The product catalog is temporarily unavailable. Please try again shortly.",
      { id, retryable: true },
    ),
    { status: 503, headers: { "Retry-After": "30" } },
  );
}
