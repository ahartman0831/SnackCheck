import type { ComplianceInput, FormulationInput } from "@snackcheck/contracts";
import { arizonaRuleset } from "./fixtures/arizona-ruleset";
import { parseIngredients } from "./parse-ingredients";
import { hashFormulation } from "./hash-ruleset";

export function formulationFromText(
  rawIngredients: string,
  overrides: Partial<FormulationInput> = {},
): FormulationInput {
  const parsed = parseIngredients(rawIngredients);
  const base: FormulationInput = {
    id: "formulation-1",
    hash: "",
    rawIngredients,
    ingredients: parsed.ingredients,
    verificationStatus: "VERIFIED",
    confidence: 0.95,
    lastVerifiedAt: "2026-08-01T00:00:00.000Z",
    conflict: false,
  };
  const merged = {
    ...base,
    ...overrides,
    rawIngredients,
    ingredients: overrides.ingredients ?? parsed.ingredients,
  };
  return { ...merged, hash: overrides.hash ?? hashFormulation(merged) };
}

export function evaluateInput(
  rawIngredients: string,
  overrides: Partial<ComplianceInput> = {},
): ComplianceInput {
  return {
    formulation: formulationFromText(rawIngredients, overrides.formulation),
    ruleset: overrides.ruleset ?? arizonaRuleset(),
    context: overrides.context ?? "CLASSROOM_DISTRIBUTION",
    evaluationDate: overrides.evaluationDate ?? "2026-08-26",
    schoolContext: overrides.schoolContext,
  };
}
