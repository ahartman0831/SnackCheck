import { describe, expect, it } from "vitest";
import { IngredientStatusSchema, INGREDIENT_STATUS_LABELS } from "../src/index";

describe("shared contracts", () => {
  it("accepts the three ingredient statuses", () => {
    expect(IngredientStatusSchema.parse("PASS")).toBe("PASS");
    expect(IngredientStatusSchema.parse("FAIL")).toBe("FAIL");
    expect(IngredientStatusSchema.parse("VERIFY")).toBe("VERIFY");
  });

  it("uses required consumer labels", () => {
    expect(INGREDIENT_STATUS_LABELS.PASS).toBe("Passes AZ ingredient check");
    expect(INGREDIENT_STATUS_LABELS.FAIL).toBe("Doesn't pass AZ ingredient check");
    expect(INGREDIENT_STATUS_LABELS.VERIFY).toBe("Verify this package");
  });
});
