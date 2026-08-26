import { NextResponse } from "next/server";
import { ok, requestId } from "@/lib/api/envelope";

export async function GET() {
  return NextResponse.json(
    ok(
      {
        localPolicyStatus: "NO_VERIFIED_POLICY",
        summary: "School participation not verified.",
      },
      requestId(),
    ),
  );
}
