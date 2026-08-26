import { NextResponse } from "next/server";
import { AnalyticsEventSchema } from "@snackcheck/contracts";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { recordEvent } from "@/lib/analytics/events";
import { getRateLimiter } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const id = requestId();
  const limiter = await getRateLimiter();
  const limited = await limiter.limit("events:public", 40, 60_000);
  if (!limited.success) {
    return NextResponse.json(ok({ dropped: true }, id));
  }
  const parsed = AnalyticsEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      fail("INVALID_EVENT", "That event is not allowed.", { id }),
      { status: 400 },
    );
  }
  await recordEvent(parsed.data);
  return NextResponse.json(ok({ recorded: true }, id));
}
