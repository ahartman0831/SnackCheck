import { describe, expect, it } from "vitest";
import type { EvidenceAttempt } from "@/lib/catalog-evidence/collector";
import {
  summarizeOpenFoodFactsComparison,
  type OpenFoodFactsComparisonCandidate,
} from "@/lib/catalog-evidence/open-food-facts-comparison";

const candidate: OpenFoodFactsComparisonCandidate = {
  id: "candidate-1",
  normalizedGtin14: "00012345678905",
  brand: "Fixture Foods",
  productName: "Pretzel Bites",
  size: "1 oz",
  normalizedIngredientText: "wheat flour salt",
};

function attempt(snapshot: unknown): EvidenceAttempt {
  return {
    candidateId: candidate.id,
    outcome: "EVIDENCE_FOUND",
    reasonCode: "ALLOWED_SOURCE_RETRIEVED",
    requestCount: 1,
    evidence: {
      url: "https://world.openfoodfacts.org/api/v3/product/12345678905",
      title: "Open Food Facts: Pretzel Bites",
      retrievedAt: "2026-09-07T00:00:00.000Z",
      observedAt: null,
      contentSha256: "a".repeat(64),
      byteSize: 100,
      mediaType: "application/json",
      licenseIdentifier: "ODbL-1.0; DbCL-1.0",
      attribution: "Open Food Facts contributors",
      ingredientText: null,
      evidenceText: JSON.stringify(snapshot),
      sourceKind: "SECONDARY",
      hostname: "world.openfoodfacts.org",
    },
  };
}

describe("Open Food Facts comparison summary", () => {
  it("reports an exact normalized ingredient match without returning ingredient text", () => {
    const result = summarizeOpenFoodFactsComparison(
      candidate,
      attempt({
        productName: "Pretzel Bites",
        brands: "Fixture Foods",
        quantity: "1 oz",
        ingredientText: "Wheat flour, salt.",
      }),
    );

    expect(result).toEqual({
      candidateId: "candidate-1",
      gtin14: "00012345678905",
      candidateBrand: "Fixture Foods",
      offBrand: "Fixture Foods",
      candidateProductName: "Pretzel Bites",
      offProductName: "Pretzel Bites",
      candidateSize: "1 oz",
      offQuantity: "1 oz",
      ingredientAgreement: "EXACT_NORMALIZED_MATCH",
    });
    expect(JSON.stringify(result)).not.toContain("wheat flour");
  });

  it("distinguishes different and missing OFF ingredients", () => {
    expect(
      summarizeOpenFoodFactsComparison(
        candidate,
        attempt({ productName: "Pretzel Bites", ingredientText: "Wheat flour, sugar" }),
      )?.ingredientAgreement,
    ).toBe("DIFFERENT");
    expect(
      summarizeOpenFoodFactsComparison(
        candidate,
        attempt({ productName: "Pretzel Bites", ingredientText: null }),
      )?.ingredientAgreement,
    ).toBe("OFF_INGREDIENTS_MISSING");
  });

  it("returns null for missing or malformed evidence", () => {
    expect(
      summarizeOpenFoodFactsComparison(candidate, {
        ...attempt({}),
        evidence: null,
      }),
    ).toBeNull();
    expect(
      summarizeOpenFoodFactsComparison(candidate, {
        ...attempt({}),
        evidence: { ...attempt({}).evidence!, evidenceText: "not-json" },
      }),
    ).toBeNull();
  });
});
