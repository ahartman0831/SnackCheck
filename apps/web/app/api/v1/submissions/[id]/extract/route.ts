import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { IngredientExtractionSchema } from "@snackcheck/contracts";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { getRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqId = requestId();
  const { id } = await context.params;
  const store = await cookies();
  const token = store.get("sc_submission")?.value ?? "";
  if (!token.startsWith(`${id}.`)) {
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

  const body = await request.json().catch(() => ({}));
  const pasted = typeof body.pastedText === "string" ? body.pastedText : "";
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
  if (admin) {
    await admin
      .from("submissions")
      .update({
        status: "NEEDS_CONFIRMATION",
        extracted_raw_text: extraction.rawText,
        extracted_ingredients: extraction,
        extraction_confidence: extraction.overallConfidence,
        extraction_provider: "paste-or-pending-vision",
      })
      .eq("id", id);
  }

  return NextResponse.json(ok({ submissionId: id, extraction }, reqId));
}
