import { describe, expect, it } from "vitest";
import { evaluateCompliance, parseIngredients } from "../src/index";
import { evaluateInput } from "../src/test-helpers";

describe("P0-2 parser warnings must block PASS", () => {
  it("does not PASS when parentheses are unbalanced", () => {
    const raw = "Sugar, salt, oil, flour, water (natural";
    expect(parseIngredients(raw).warnings).toContain("UNBALANCED_PARENTHESES");
    const result = evaluateCompliance(evaluateInput(raw));
    expect(result.ingredientStatus).not.toBe("PASS");
  });

  it("does not PASS when the ingredient input is truncated", () => {
    const raw = `${"Sugar, salt, oil, flour, water, ".repeat(800)}oats`;
    expect(raw.length).toBeGreaterThan(20_000);
    expect(parseIngredients(raw).warnings).toContain("INPUT_TRUNCATED");
    const result = evaluateCompliance(evaluateInput(raw));
    expect(result.ingredientStatus).not.toBe("PASS");
  });
});
