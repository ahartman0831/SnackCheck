import { NextResponse } from "next/server";
import { AnalyticsEventSchema } from "@snackcheck/contracts";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { recordEvent } from "@/lib/analytics/events";
import { enforceRateLimit } from "@/lib/rate-limit/request";

export async function POST(request: Request) {
  const id = requestId();
  const rateLimit = await enforceRateLimit({
    request,
    scope: "events",
    max: 40,
    windowMs: 60_000,
    requestId: id,
  });
  if (rateLimit) {
    return NextResponse.json(ok({ dropped: true }, id));
  }
  const parsed = AnalyticsEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      fail("INVALID_EVENT", "That event is not allowed.", { id }),
      { status: 400 },
    );
  }
  const recorded = await recordEvent(parsed.data);
  return NextResponse.json(ok({ recorded }, id));
}
