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
  if (!token.startsWith(`${id}.`)) {
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
  });

  return NextResponse.json(ok({ result, confirmed: true }, reqId));
}
