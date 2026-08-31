import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { env } from "@/lib/env";
import {
  bearerTokenMatches,
  productionFeaturesAreOff,
  readinessStatus,
  type ReadinessChecks,
} from "@/lib/observability/health";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = requestId();
  if (
    !bearerTokenMatches(request.headers.get("authorization"), env.SYNTHETIC_MONITOR_TOKEN)
  ) {
    return NextResponse.json(
      fail("UNAUTHORIZED", "Monitor authentication required.", { id }),
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      ok(
        {
          status: "degraded" as const,
          checks: {
            database: false,
            photoPipelineStopped: false,
            aiExtractionStopped: false,
            productionFeaturesOff: productionFeaturesAreOff(),
          },
          checkedAt: new Date().toISOString(),
        },
        id,
      ),
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const settings = await admin
    .from("application_settings")
    .select("key,value")
    .in("key", ["photo_pipeline_kill_switch", "ai_extraction_kill_switch"]);
  const values = new Map((settings.data ?? []).map((row) => [row.key, row.value]));
  const checks: ReadinessChecks = {
    database: !settings.error,
    photoPipelineStopped: values.get("photo_pipeline_kill_switch") === true,
    aiExtractionStopped: values.get("ai_extraction_kill_switch") === true,
    productionFeaturesOff: productionFeaturesAreOff(),
  };
  const status = readinessStatus(checks);

  return NextResponse.json(
    ok(
      {
        status,
        checks,
        checkedAt: new Date().toISOString(),
        release: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      },
      id,
    ),
    {
      status: status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
