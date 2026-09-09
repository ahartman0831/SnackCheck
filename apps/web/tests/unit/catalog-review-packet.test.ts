import { describe, expect, it } from "vitest";
import {
  buildCatalogReviewPacket,
  safeEvidenceUrl,
  type ReviewEvidenceRow,
} from "@/lib/catalog-evidence/review-packet";
const candidate = {
  id: "candidate-1",
  gtin14: "00012345678905",
  rawIngredientText: "oats, sugar, salt",
};
const row = (overrides: Partial<ReviewEvidenceRow> = {}): ReviewEvidenceRow => ({
  id: "evidence-1",
  candidate_id: candidate.id,
  source_url: "https://world.openfoodfacts.org/api/v3/product/12345678905",
  source_kind: "SECONDARY",
  outcome: "EVIDENCE_FOUND",
  reason_code: "ALLOWED_SOURCE_RETRIEVED",
  evidence_title: "OFF oats",
  ingredient_text: null,
  evidence_text: JSON.stringify({
    code: "012345678905",
    productName: "Oats",
    brands: "Fixture",
    quantity: "30g",
    ingredientText: "OATS, sugar, salt.",
  }),
  observed_at: "2026-09-01T00:00:00Z",
  retrieved_at: "2026-09-09T00:00:00Z",
  created_at: "2026-09-09T00:00:00Z",
  license_identifier: "ODbL-1.0; DbCL-1.0",
  attribution: "Open Food Facts contributors",
  ...overrides,
});
describe("saved catalog evidence review", () => {
  it("decodes licensed OFF text from the saved snapshot without calling it manufacturer evidence", () => {
    const result = buildCatalogReviewPacket(candidate, [row()]);
    expect(result).toMatchObject({
      reviewOnly: true,
      nextStep: "VERIFY_IDENTITY_AND_DATE",
      manufacturerIngredientsAvailable: false,
    });
    expect(result.sources[0]).toMatchObject({
      identity: "BARCODE_MATCH",
      comparison: "TEXT_MATCH",
      ingredientText: "OATS, sugar, salt.",
      recordUpdatedAt: "2026-09-01T00:00:00Z",
      licenseIdentifier: "ODbL-1.0; DbCL-1.0",
    });
  });
  it("selects the newest source snapshot regardless of input order", () => {
    const older = row({
      id: "older",
      created_at: "2026-08-01T00:00:00Z",
      evidence_text: JSON.stringify({
        code: "012345678905",
        ingredientText: "oats, oil",
      }),
    });
    for (const rows of [
      [row(), older],
      [older, row()],
    ])
      expect(buildCatalogReviewPacket(candidate, rows).sources[0].comparison).toBe(
        "TEXT_MATCH",
      );
  });
  it("does not use another candidate's evidence", () =>
    expect(
      buildCatalogReviewPacket(candidate, [row({ candidate_id: "other" })]).sources,
    ).toEqual([]));
  it("keeps source differences unresolved", () => {
    expect(
      buildCatalogReviewPacket(
        { ...candidate, rawIngredientText: "oats, turmeric, salt" },
        [row()],
      ).nextStep,
    ).toBe("COMPARE_INGREDIENTS");
  });
  it("flags a different valid barcode before ingredient agreement", () => {
    expect(
      buildCatalogReviewPacket(candidate, [
        row({
          evidence_text: JSON.stringify({
            code: "012345678912",
            ingredientText: candidate.rawIngredientText,
          }),
        }),
      ]).nextStep,
    ).toBe("RESOLVE_IDENTITY");
  });
  it("does not treat malformed, missing or spoofed OFF JSON as evidence", () => {
    for (const override of [
      { evidence_text: "{" },
      { evidence_text: "{}" },
      { source_url: "https://openfoodfacts.org.attacker.test/product/1" },
    ])
      expect(buildCatalogReviewPacket(candidate, [row(override)]).nextStep).toBe(
        "COLLECT_INGREDIENT_EVIDENCE",
      );
  });
  it("preserves parser warnings even when source text matches", () => {
    const text = "oats, flour (wheat";
    expect(
      buildCatalogReviewPacket({ ...candidate, rawIngredientText: text }, [
        row({ evidence_text: JSON.stringify({ ingredientText: text }) }),
      ]).nextStep,
    ).toBe("REPAIR_SOURCE_TEXT");
  });
  it("does not resurrect older evidence after a newer failed source attempt", () => {
    const failed = row({
      id: "failure",
      created_at: "2026-09-10T00:00:00Z",
      outcome: "FAILED",
      ingredient_text: null,
      evidence_text: null,
    });
    expect(
      buildCatalogReviewPacket(candidate, [row(), failed]).sources[0].ingredientText,
    ).toBeNull();
  });
  it("shows missing-record attempts distinctly from no collection", () => {
    const result = buildCatalogReviewPacket(candidate, [
      row({
        source_url: null,
        source_kind: null,
        outcome: "NO_EVIDENCE_FOUND",
        evidence_text: null,
      }),
    ]);
    expect(result.sources).toEqual([]);
    expect(result.attemptsWithoutSource).toHaveLength(1);
  });
  it("only emits credential-free standard HTTPS links", () => {
    for (const value of [
      "javascript:alert(1)",
      "https://user:secret@example.com",
      "http://example.com",
      "https://example.com:444",
      "not a URL",
    ])
      expect(safeEvidenceUrl(value)).toBeNull();
    expect(safeEvidenceUrl("https://example.com:443/path")).toBe(
      "https://example.com/path",
    );
  });
});
