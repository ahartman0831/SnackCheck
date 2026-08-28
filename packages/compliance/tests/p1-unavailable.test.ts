import { describe, expect, it } from "vitest";
import { evaluateCompliance, parseIngredients, unavailableRuleset } from "../src/index";
import { evaluateInput } from "../src/test-helpers";

describe("Phase 1 fail-closed evaluations", () => {
  it("returns VERIFY when no published ruleset is available", () => {
    const result = evaluateCompliance(
      evaluateInput("Sugar, salt, oil, flour, water", {
        ruleset: unavailableRuleset(),
      }),
    );
    expect(result.ingredientStatus).toBe("VERIFY");
    expect(result.qualityFlags).toContain("RULESET_UNAVAILABLE");
  });

  it("returns VERIFY for an unpublished or empty snapshot", () => {
    const ruleset = {
      ...unavailableRuleset(),
      isPublished: false,
      substances: [],
    };
    const result = evaluateCompliance(evaluateInput("Sugar, salt", { ruleset }));
    expect(result.ingredientStatus).toBe("VERIFY");
    expect(result.qualityFlags).toContain("RULESET_UNAVAILABLE");
  });

  it("keeps multi-item May contain sections precautionary", () => {
    const parsed = parseIngredients("Corn, salt. May contain milk, Red dye 40");
    const red = parsed.ingredients.find((item) => item.normalized.includes("red dye 40"));
    expect(red?.presenceKind).toBe("PRECAUTIONARY");
    const result = evaluateCompliance(
      evaluateInput("Corn, salt. May contain milk, Red dye 40"),
    );
    expect(result.ingredientStatus).toBe("VERIFY");
    expect(result.qualityFlags).toContain("PRECAUTIONARY_MATCH_ONLY");
    expect(result.ingredientStatus).not.toBe("FAIL");
  });
});
