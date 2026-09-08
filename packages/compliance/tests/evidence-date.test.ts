import { describe, expect, it } from "vitest";
import { evaluateCompliance } from "../src/engine";
import { evaluateInput, formulationFromText } from "../src/test-helpers";

describe("verified evidence requires a trustworthy date", () => {
  it.each([null, "invalid", "2026-08-27T00:00:00Z"])(
    "never passes evidence dated %s",
    (lastVerifiedAt) => {
      const result = evaluateCompliance(
        evaluateInput("oats, sugar, salt", {
          formulation: formulationFromText("oats, sugar, salt", { lastVerifiedAt }),
        }),
      );
      expect(result.ingredientStatus).toBe("VERIFY");
      expect(result.qualityFlags).toContain("STALE_EVIDENCE");
    },
  );
  it("accepts verification on the same calendar day", () => {
    const result = evaluateCompliance(
      evaluateInput("oats, sugar, salt", {
        formulation: formulationFromText("oats, sugar, salt", {
          lastVerifiedAt: "2026-08-26T23:00:00Z",
        }),
      }),
    );
    expect(result.ingredientStatus).toBe("PASS");
  });
});
