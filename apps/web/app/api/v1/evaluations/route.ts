import { NextResponse } from "next/server";
import { z } from "zod";
import {
  evaluateCompliance,
  parseIngredients,
  hashFormulation,
} from "@snackcheck/compliance";
import { EvaluationContextSchema } from "@snackcheck/contracts";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { loadPublishedArizonaRuleset } from "@/lib/rules/arizona";

const BodySchema = z.object({
  ingredients: z.string().min(1).max(10_000),
  context: EvaluationContextSchema.default("CLASSROOM_DISTRIBUTION"),
});

export async function POST(request: Request) {
  const id = requestId();
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      fail("INVALID_BODY", "Ingredient text is required.", { id }),
      { status: 400 },
    );
  }
  const ruleset = await loadPublishedArizonaRuleset();
  const ingredients = parseIngredients(parsed.data.ingredients);
  const formulation = {
    id: "ad-hoc",
    hash: hashFormulation({
      rawIngredients: parsed.data.ingredients,
      ingredients: ingredients.ingredients,
    }),
    rawIngredients: parsed.data.ingredients,
    ingredients: ingredients.ingredients,
    verificationStatus: "COMMUNITY_SUBMITTED" as const,
    confidence: null,
    lastVerifiedAt: new Date().toISOString(),
    conflict: false,
  };
  const result = evaluateCompliance({
    formulation,
    ruleset,
    context: parsed.data.context,
    evaluationDate: new Date().toISOString().slice(0, 10),
  });
  return NextResponse.json(ok(result, id));
}
