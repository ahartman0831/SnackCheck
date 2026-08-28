import { describe, expect, it } from "vitest";
import { approvedCatalogSource } from "../../lib/products/lookup-policy";
import { mapLiveSearchCard } from "../../lib/products/public-search-card";

describe("P0-3 public search cards", () => {
  it("must not emit ingredientStatus: null as a finished public card", () => {
    const card = mapLiveSearchCard({
      id: "prod-1",
      slug: "plain-oat-bars",
      brand: "Example",
      name: "Oat Bars",
      variant: null,
      category: "bars",
      image_url: null,
    });
    expect(card.ingredientStatus).not.toBeNull();
  });
});

describe("P0-8 approved catalog", () => {
  it("must query the live approved projection when Supabase is configured", () => {
    expect(approvedCatalogSource({ hasAdminClient: true })).toBe("live-query");
  });
});
