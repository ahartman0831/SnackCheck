import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  executeCatalogAiComparisons,
  planCatalogAiComparisons,
} from "@/lib/catalog-evidence/ai-comparison-runner";
import { assertStagingRuntimeSafety } from "@/lib/catalog-candidates/operation-safety";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 180;

const BodySchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1).max(5),
  confirmation: z.literal("RUN_STAGING_AI_COMPARISON"),
});

export async function POST(request: Request) {
  const id = requestId();
  const auth = await requireAdmin(["SUPER_ADMIN"]);
  if (!auth.allowed) {
    return NextResponse.json(
      fail("FORBIDDEN", "Active owner access is required.", { id }),
      { status: 403 },
    );
  }

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (
    !body.success ||
    new Set(body.data.candidateIds).size !== body.data.candidateIds.length
  ) {
    return NextResponse.json(
      fail(
        "INVALID_BODY",
        "Select between one and five unique candidates and confirm the staging AI run.",
        { id },
      ),
      { status: 400 },
    );
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.OPENAI_API_KEY) {
    return NextResponse.json(
      fail("ADMIN_UNAVAILABLE", "The staging AI service is not configured.", { id }),
      { status: 503 },
    );
  }

  try {
    assertStagingRuntimeSafety({
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      vercelEnvironment: env.VERCEL_ENV,
    });
  } catch {
    return NextResponse.json(
      fail(
        "FORBIDDEN",
        "This operation is available only in the protected staging preview.",
        {
          id,
        },
      ),
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      fail("ADMIN_UNAVAILABLE", "The staging database is unavailable.", { id }),
      { status: 503 },
    );
  }

  const runId = randomUUID();
  try {
    const planned = await planCatalogAiComparisons(admin, body.data.candidateIds);
    const outcomes = await executeCatalogAiComparisons({
      admin,
      runId,
      model: env.OPENAI_VISION_MODEL,
      apiKey: env.OPENAI_API_KEY,
      planned,
    });
    const run = await admin
      .from("catalog_evidence_ai_runs")
      .select(
        "status,planned_candidates,attempted_candidates,continued_candidates,human_exception_candidates,failed_candidates,estimated_total_cost_usd",
      )
      .eq("id", runId)
      .single();
    if (run.error) throw new Error(run.error.message);
    return NextResponse.json(ok({ runId, summary: run.data, outcomes }, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The AI comparison failed.";
    const expected =
      message.includes("safety switch") ||
      message.includes("limit") ||
      message.includes("eligible") ||
      message.includes("manufacturer evidence") ||
      message.includes("Select between");
    return NextResponse.json(
      fail(
        expected ? "AI_COMPARISON_NOT_READY" : "AI_COMPARISON_FAILED",
        expected
          ? message
          : "The comparison stopped safely. No product was approved or published.",
        { id },
      ),
      { status: expected ? 409 : 502 },
    );
  }
}
