import { describe, expect, it } from "vitest";
import type { EnabledAlias, PublishedRulesetSnapshot } from "@snackcheck/contracts";
import {
  arizonaRuleset,
  evaluateCompliance,
  normalizeAlias,
  parseIngredients,
} from "../src/index";
import { evaluateInput, formulationFromText } from "../src/test-helpers";

const STATUTES = [
  "Potassium bromate",
  "Propylparaben",
  "Titanium dioxide",
  "Brominated vegetable oil",
  "Yellow dye 5",
  "Yellow dye 6",
  "Blue dye 1",
  "Blue dye 2",
  "Green dye 3",
  "Red dye 3",
  "Red dye 40",
];

describe("normalization", () => {
  it("treats mechanical statute variants as the same alias", () => {
    expect(normalizeAlias("Yellow Dye No. 5")).toBe("yellow dye no 5");
    expect(normalizeAlias("Yellow Dye No 5")).toBe("yellow dye no 5");
    expect(normalizeAlias("Yellow Dye #5")).toBe("yellow dye no 5");
    expect(normalizeAlias("YELLOW DYE 5")).toBe("yellow dye 5");
  });
});

describe("parser", () => {
  it("keeps nested parentheses and lead-ins", () => {
    const parsed = parseIngredients(
      "Sugar, Enriched flour (wheat flour, niacin), contains 2% or less of: salt, Red dye 40",
    );
    const names = parsed.ingredients.map((item) => item.normalized);
    expect(names).toContain("sugar");
    expect(names).toContain("wheat flour");
    expect(names).toContain("red dye 40");
  });

  it("marks may contain as precautionary", () => {
    const parsed = parseIngredients("Corn, salt. May contain Red dye 40");
    const precaution = parsed.ingredients.find((item) =>
      item.normalized.includes("red dye 40"),
    );
    expect(precaution?.presenceKind).toBe("PRECAUTIONARY");
  });

  it("warns on unbalanced parentheses instead of throwing", () => {
    const parsed = parseIngredients("Sugar, flavor (natural");
    expect(parsed.warnings).toContain("UNBALANCED_PARENTHESES");
  });
});

describe("engine matching", () => {
  it.each(STATUTES)("fails on the exact statutory name %s", (name) => {
    const result = evaluateCompliance(evaluateInput(`Sugar, ${name}, salt`));
    expect(result.ingredientStatus).toBe("FAIL");
    expect(result.matchedRules.some((match) => match.canonicalName === name)).toBe(true);
  });

  it("fails when several prohibited ingredients are present", () => {
    const result = evaluateCompliance(
      evaluateInput("Sugar, Red dye 40, Yellow dye 5, salt"),
    );
    expect(result.matchedRules.length).toBeGreaterThanOrEqual(2);
  });

  it("does not treat food words as dyes", () => {
    for (const text of [
      "red peppers, salt",
      "yellow corn flour, oil",
      "blue corn, lime",
      "green tea, sugar",
      "blueberry puree",
    ]) {
      const result = evaluateCompliance(evaluateInput(text));
      expect(result.ingredientStatus).not.toBe("FAIL");
    }
  });

  it("does not match a disabled pending alias", () => {
    const ruleset = arizonaRuleset();
    const red40 = ruleset.substances.find((item) => item.canonicalName === "Red dye 40");
    if (!red40) throw new Error("missing red 40");
    const pending = {
      id: "pending-e129",
      alias: "E129",
      normalizedAlias: "e129",
      matchMode: "EXACT_SEGMENT",
      reviewStatus: "EXACT_STATUTE_TERM",
      enabled: false,
      regulatorySourceId: null,
    };
    const withPending: PublishedRulesetSnapshot = {
      ...ruleset,
      substances: ruleset.substances.map((substance) =>
        substance.id === red40.id
          ? {
              ...substance,
              aliases: [...substance.aliases, pending as unknown as EnabledAlias],
            }
          : substance,
      ),
    };
    const result = evaluateCompliance(
      evaluateInput("Sugar, E129", { ruleset: withPending }),
    );
    expect(result.ingredientStatus).not.toBe("FAIL");
  });

  it("returns VERIFY for precautionary-only matches", () => {
    const result = evaluateCompliance(
      evaluateInput("Corn, salt. May contain Red dye 40"),
    );
    expect(result.ingredientStatus).toBe("VERIFY");
    expect(result.qualityFlags).toContain("PRECAUTIONARY_MATCH_ONLY");
  });
});

describe("precedence", () => {
  it("keeps FAIL plus stale flag when a match is present", () => {
    const result = evaluateCompliance(
      evaluateInput("Sugar, Red dye 40", {
        formulation: formulationFromText("Sugar, Red dye 40", {
          lastVerifiedAt: "2024-01-01T00:00:00.000Z",
        }),
      }),
    );
    expect(result.ingredientStatus).toBe("FAIL");
    expect(result.qualityFlags).toContain("STALE_EVIDENCE");
  });

  it("returns VERIFY for a stale clean formulation", () => {
    const result = evaluateCompliance(
      evaluateInput("Sugar, salt, oil, flour, water", {
        formulation: formulationFromText("Sugar, salt, oil, flour, water", {
          lastVerifiedAt: "2024-01-01T00:00:00.000Z",
        }),
      }),
    );
    expect(result.ingredientStatus).toBe("VERIFY");
  });

  it("returns VERIFY for conflicting clean formulations", () => {
    const result = evaluateCompliance(
      evaluateInput("Sugar, salt, oil, flour, water", {
        formulation: formulationFromText("Sugar, salt, oil, flour, water", {
          conflict: true,
        }),
      }),
    );
    expect(result.ingredientStatus).toBe("VERIFY");
    expect(result.qualityFlags).toContain("ACTIVE_CONFLICT");
  });

  it("returns VERIFY for low-confidence clean OCR", () => {
    const result = evaluateCompliance(
      evaluateInput("Sugar, salt, oil, flour, water", {
        formulation: formulationFromText("Sugar, salt, oil, flour, water", {
          confidence: 0.2,
          verificationStatus: "COMMUNITY_SUBMITTED",
        }),
      }),
    );
    expect(result.ingredientStatus).toBe("VERIFY");
  });

  it("returns FAIL plus confidence warning for low-confidence OCR with a match", () => {
    const result = evaluateCompliance(
      evaluateInput("Sugar, Red dye 40", {
        formulation: formulationFromText("Sugar, Red dye 40", {
          confidence: 0.2,
        }),
      }),
    );
    expect(result.ingredientStatus).toBe("FAIL");
    expect(result.qualityFlags).toContain("LOW_CONFIDENCE");
  });

  it("returns VERIFY when the ruleset is not yet effective", () => {
    const result = evaluateCompliance(
      evaluateInput("Sugar, salt, oil, flour, water", { evaluationDate: "2026-01-01" }),
    );
    expect(result.ingredientStatus).toBe("VERIFY");
    expect(result.qualityFlags).toContain("RULESET_UNAVAILABLE");
  });

  it("keeps personal-child applicability independent of ingredient result", () => {
    const fail = evaluateCompliance(
      evaluateInput("Sugar, Red dye 40", { context: "PARENT_OWN_CHILD" }),
    );
    expect(fail.ingredientStatus).toBe("FAIL");
    expect(fail.applicabilityStatus).toBe("PARENT_OWN_CHILD_EXCEPTION");

    const pass = evaluateCompliance(
      evaluateInput("Sugar, salt, oil, flour, water", { context: "PARENT_OWN_CHILD" }),
    );
    expect(pass.ingredientStatus).toBe("PASS");
    expect(pass.applicabilityStatus).toBe("PARENT_OWN_CHILD_EXCEPTION");
  });

  it("is deterministic", () => {
    const input = evaluateInput("Sugar, Red dye 40, salt");
    const first = evaluateCompliance(input);
    const second = evaluateCompliance(input);
    expect(second).toEqual(first);
  });
});
