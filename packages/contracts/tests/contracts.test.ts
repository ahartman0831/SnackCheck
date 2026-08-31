import { describe, expect, it } from "vitest";
import {
  AnalyticsEventSchema,
  CatalogSourceRecordSchema,
  IngredientStatusSchema,
  INGREDIENT_STATUS_LABELS,
  PublicProductCardSchema,
} from "../src/index";

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

  it("accepts privacy-safe barcode camera events", () => {
    expect(
      AnalyticsEventSchema.parse({
        name: "barcode_scan_failed",
        properties: { failureCode: "permission_denied" },
      }).name,
    ).toBe("barcode_scan_failed");
    expect(
      AnalyticsEventSchema.parse({
        name: "barcode_scan_fallback",
        properties: { category: "manual" },
      }).name,
    ).toBe("barcode_scan_fallback");
  });

  it("requires a finished public product card status", () => {
    expect(() =>
      PublicProductCardSchema.parse({
        id: "1",
        slug: "oat-bars",
        brand: "Example",
        name: "Oat Bars",
        variant: null,
        size: null,
        category: "bars",
        imageUrl: null,
        imageAttribution: null,
        ingredientStatus: null,
        verificationStatus: null,
        lastVerifiedAt: null,
        freshnessState: "UNKNOWN",
        formulationConflict: false,
        rulesetHash: null,
      }),
    ).toThrow();
  });

  it("accepts a private catalog source record with complete provenance", () => {
    expect(
      CatalogSourceRecordSchema.parse({
        provider: "USDA_FDC",
        externalRecordId: "123",
        sourceVersion: "2026-08-01",
        sourceRecordSha256: "a".repeat(64),
        sourceGtin: "012345678905",
        normalizedGtin14: "00012345678905",
        brand: "Fixture Foods",
        productName: "Oat Bites",
        variant: null,
        size: "6 oz",
        category: "Snacks",
        rawIngredientText: "Oats, salt",
        normalizedIngredientText: "oats, salt",
        ingredientTextSha256: "b".repeat(64),
        marketCountry: "United States",
        sourceModifiedAt: "2026-08-01T00:00:00.000Z",
        sourcePublishedAt: null,
        discontinued: false,
        sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/123",
        sourceReference: "FDC 123",
        licenseIdentifier: "CC0-1.0",
        attribution: "USDA FoodData Central",
        screenStatus: "PASS",
        qualityFlags: [],
        matchedRuleIds: [],
        engineVersion: "0.1.0",
        rulesetHash: "c".repeat(64),
      }).provider,
    ).toBe("USDA_FDC");
  });
});
