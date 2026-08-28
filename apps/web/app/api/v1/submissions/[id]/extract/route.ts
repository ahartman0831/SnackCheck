import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { IngredientExtractionSchema } from "@snackcheck/contracts";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { getRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownsSubmission } from "@/lib/submissions/submission-ownership";

const BodySchema = z.object({
  pastedText: z.string().trim().min(1).max(10_000),
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
      fail("FORBIDDEN", "This submission is not yours to process.", { id: reqId }),
      {
        status: 403,
      },
    );
  }

  const limiter = await getRateLimiter();
  const limited = await limiter.limit("extract:public", 4, 60_000);
  if (!limited.success) {
    return NextResponse.json(
      fail(
        "RATE_LIMITED",
        "Ingredient scanning is temporarily unavailable. You can paste the ingredient list or try again later.",
        {
          retryable: true,
          id: reqId,
        },
      ),
      { status: 429 },
    );
  }

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      fail("INVALID_BODY", "Paste the ingredient list before continuing.", {
        id: reqId,
      }),
      { status: 400 },
    );
  }
  const pasted = body.data.pastedText;
  const extraction = IngredientExtractionSchema.parse({
    panelFound: pasted.length > 0,
    rawText: pasted,
    ingredientText: pasted,
    ingredients: pasted
      ? pasted.split(",").map((raw: string) => ({
          raw: raw.trim(),
          normalizedSuggestion: raw.trim().toLowerCase(),
          confidence: 0.5,
          startOffset: null,
          endOffset: null,
        }))
      : [],
    overallConfidence: pasted ? 0.5 : 0,
    warnings: pasted ? [] : ["NO_INGREDIENT_PANEL"],
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

  const updated = await admin
    .from("submissions")
    .update({
      status: "NEEDS_CONFIRMATION",
      extracted_raw_text: extraction.rawText,
      extracted_ingredients: extraction,
      extraction_confidence: extraction.overallConfidence,
      extraction_provider: "pasted-text",
    })
    .eq("id", id)
    .in("status", ["UPLOAD_PENDING", "SANITIZED"])
    .select("id")
    .maybeSingle();
  if (updated.error || !updated.data) {
    return NextResponse.json(
      fail("SUBMISSION_STATE", "This submission cannot accept ingredient text.", {
        id: reqId,
      }),
      { status: 409 },
    );
  }

  return NextResponse.json(ok({ submissionId: id, extraction }, reqId));
}
