import { describe, expect, it } from "vitest";
import {
  APPROVED_FORBIDDEN,
  APPROVED_HEADING,
  barcodeActionLabel,
  barcodePageDescription,
  barcodePageTitle,
  ingredientActionLabel,
  ingredientPageTitle,
} from "../../lib/public-copy";

describe("feature-flag public wording", () => {
  it("uses manual barcode copy when the camera flag is off", () => {
    const env = { FEATURE_BARCODE_CAMERA: "false" };
    expect(barcodeActionLabel(env)).toBe("Enter a barcode");
    expect(barcodePageTitle(env)).toBe("Enter a barcode");
    expect(barcodeActionLabel({ FEATURE_BARCODE_CAMERA: "true" })).toBe("Scan a barcode");
    expect(barcodePageDescription(env)).toMatch(/Type or paste/);
    expect(barcodePageDescription({ FEATURE_BARCODE_CAMERA: "true" })).toMatch(/camera/i);
  });

  it("uses paste copy when ingredient photo flags are off", () => {
    const env = {
      FEATURE_INGREDIENT_PHOTO: "false",
      FEATURE_PHOTO_EXTRACTION: "false",
    };
    expect(ingredientActionLabel(env)).toBe("Paste ingredients");
    expect(ingredientPageTitle(env)).toBe("Check an ingredient list");
    expect(ingredientActionLabel({ FEATURE_INGREDIENT_PHOTO: "true" })).toBe(
      "Photograph ingredients",
    );
  });

  it("keeps approved-list language honest", () => {
    expect(APPROVED_HEADING).toBe("Products that pass the Arizona ingredient check");
    for (const phrase of APPROVED_FORBIDDEN) {
      expect(APPROVED_HEADING.toLowerCase()).not.toContain(phrase);
    }
  });
});
