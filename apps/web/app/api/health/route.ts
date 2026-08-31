import { NextResponse } from "next/server";
import { ok } from "@/lib/api/envelope";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    ok({
      status: "ok" as const,
      checkedAt: new Date().toISOString(),
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
