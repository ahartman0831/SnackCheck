import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  evaluateCompliance,
  hashFormulation,
  parseIngredients,
} from "@snackcheck/compliance";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { loadPublishedArizonaRuleset } from "@/lib/rules/arizona";
import { ownsSubmission } from "@/lib/submissions/submission-ownership";
import { createAdminClient } from "@/lib/supabase/admin";

const BodySchema = z.object({
  correctedText: z.string().min(1).max(10_000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqId = requestId();
  const { id } = await context.params;
  const store = await cookies();
  const token = store.get("sc_submission")?.value ?? "";
  if (!(await ownsSubmission(token, id))) {
    return NextResponse.json(
      fail("FORBIDDEN", "This submission is not yours to confirm.", { id: reqId }),
      {
        status: 403,
      },
    );
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      fail("INVALID_BODY", "Confirm the ingredient text first.", { id: reqId }),
      {
        status: 400,
      },
    );
  }

  const ruleset = await loadPublishedArizonaRuleset();
  const ingredients = parseIngredients(parsed.data.correctedText);
  const result = evaluateCompliance({
    formulation: {
      id,
      hash: hashFormulation({
        rawIngredients: parsed.data.correctedText,
        ingredients: ingredients.ingredients,
      }),
      rawIngredients: parsed.data.correctedText,
      ingredients: ingredients.ingredients,
      verificationStatus: "COMMUNITY_SUBMITTED",
      confidence: 0.7,
      lastVerifiedAt: new Date().toISOString(),
      conflict: false,
    },
    ruleset,
    context: "CLASSROOM_DISTRIBUTION",
    evaluationDate: new Date().toISOString().slice(0, 10),
    parserWarnings: ingredients.warnings,
  });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      fail("SUBMISSIONS_DISABLED", "Ingredient submissions are unavailable.", {
        id: reqId,
      }),
      { status: 503 },
    );
  }
  const finalized = await admin.rpc(
    "finalize_submission_evaluation" as never,
    {
      p_submission_id: id,
      p_corrected_text: parsed.data.correctedText,
      p_formulation_hash: result.formulationHash,
      p_evaluation_result: result,
    } as never,
  );
  if (finalized.error || finalized.data !== true) {
    return NextResponse.json(
      fail("SUBMISSION_STATE", "This submission cannot be confirmed.", { id: reqId }),
      { status: 409 },
    );
  }

  const response = NextResponse.json(ok({ result, confirmed: true }, reqId));
  response.cookies.set("sc_submission", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/submissions/",
    maxAge: 0,
  });
  return response;
}
