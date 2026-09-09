import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CatalogEvidenceReview } from "@/components/admin/catalog-evidence-review";
import {
  buildCatalogReviewPacket,
  type ReviewEvidenceRow,
} from "@/lib/catalog-evidence/review-packet";
afterEach(cleanup);
describe("catalog evidence review screen", () => {
  it("shows actionable missing evidence without asking the owner for photos", () => {
    render(
      <CatalogEvidenceReview
        packet={buildCatalogReviewPacket(
          { id: "1", gtin14: "00012345678905", rawIngredientText: "oats" },
          [],
        )}
        truncated={false}
      />,
    );
    expect(screen.getByText("Next: Collect ingredient evidence")).toBeInTheDocument();
    expect(screen.getByText(/No evidence collection attempts/)).toBeInTheDocument();
    expect(screen.getByText(/owner-supplied photos are optional/)).toBeInTheDocument();
  });
  it("shows saved ingredients, uncertainty, attribution and truncation", () => {
    const row = {
      id: "e1",
      candidate_id: "1",
      outcome: "EVIDENCE_FOUND",
      source_kind: "SECONDARY",
      source_url: "https://world.openfoodfacts.org/product/012345678905",
      evidence_title: "Saved OFF record",
      evidence_text: JSON.stringify({
        code: "012345678905",
        ingredientText: "oats, salt",
        productName: "Oats",
        brands: "Fixture",
        quantity: "30g",
      }),
      ingredient_text: null,
      observed_at: "2026-09-01T00:00:00Z",
      retrieved_at: "2026-09-09T00:00:00Z",
      created_at: "2026-09-09T00:00:00Z",
      license_identifier: "ODbL-1.0; DbCL-1.0",
      attribution: "Open Food Facts contributors",
      reason_code: "ALLOWED_SOURCE_RETRIEVED",
    } satisfies ReviewEvidenceRow;
    render(
      <CatalogEvidenceReview
        packet={buildCatalogReviewPacket(
          { id: "1", gtin14: "00012345678905", rawIngredientText: "oats, sugar" },
          [row],
        )}
        truncated
      />,
    );
    expect(screen.getByText("oats, salt")).toBeInTheDocument();
    expect(screen.getByText("Ingredient wording differs")).toBeInTheDocument();
    expect(screen.getByText("Open Food Facts contributors")).toBeInTheDocument();
    expect(screen.getByText(/not package-label dates/)).toBeInTheDocument();
    expect(screen.getByText(/not the complete history/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open evidence source" })).toHaveAttribute(
      "href",
      row.source_url,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
