import { normalizeIngredientText } from "@snackcheck/compliance";
import { z } from "zod";
import type { EvidenceAttempt } from "./collector";

const OpenFoodFactsSnapshotSchema = z.object({
  code: z.string().nullable().optional(),
  productName: z.string().nullable().optional(),
  brands: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(),
  ingredientText: z.string().nullable().optional(),
});

export type OpenFoodFactsComparisonCandidate = {
  id: string;
  normalizedGtin14: string;
  brand: string;
  productName: string;
  size: string | null;
  normalizedIngredientText: string;
};

export type IngredientAgreement =
  "EXACT_NORMALIZED_MATCH" | "DIFFERENT" | "OFF_INGREDIENTS_MISSING";

export type OpenFoodFactsComparison = {
  candidateId: string;
  gtin14: string;
  candidateBrand: string;
  offBrand: string | null;
  candidateProductName: string;
  offProductName: string | null;
  candidateSize: string | null;
  offQuantity: string | null;
  ingredientAgreement: IngredientAgreement;
};

export function summarizeOpenFoodFactsComparison(
  candidate: OpenFoodFactsComparisonCandidate,
  attempt: EvidenceAttempt,
): OpenFoodFactsComparison | null {
  if (!attempt.evidence) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(attempt.evidence.evidenceText);
  } catch {
    return null;
  }
  const parsed = OpenFoodFactsSnapshotSchema.safeParse(decoded);
  if (!parsed.success) return null;

  const offIngredients = parsed.data.ingredientText?.trim() ?? "";
  const ingredientAgreement: IngredientAgreement = offIngredients
    ? normalizeIngredientText(offIngredients) ===
      normalizeIngredientText(candidate.normalizedIngredientText)
      ? "EXACT_NORMALIZED_MATCH"
      : "DIFFERENT"
    : "OFF_INGREDIENTS_MISSING";

  return {
    candidateId: candidate.id,
    gtin14: candidate.normalizedGtin14,
    candidateBrand: candidate.brand,
    offBrand: parsed.data.brands?.trim() || null,
    candidateProductName: candidate.productName,
    offProductName: parsed.data.productName?.trim() || null,
    candidateSize: candidate.size,
    offQuantity: parsed.data.quantity?.trim() || null,
    ingredientAgreement,
  };
}
