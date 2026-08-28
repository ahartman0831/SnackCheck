import { describe, expect, it } from "vitest";
import {
  clampSearchLimit,
  escapeLikeWildcards,
  normalizeSearchQuery,
} from "../../lib/products/search-query";
import { mapLiveSearchCard } from "../../lib/products/public-search-card";

describe("public search query", () => {
  it("escapes percent, underscore, and backslash", () => {
    expect(escapeLikeWildcards("100%_off\\x")).toBe("100\\%\\_off\\\\x");
  });

  it("rejects malformed and oversized input", () => {
    expect(normalizeSearchQuery("a")).toEqual({ error: "too_short" });
    expect(normalizeSearchQuery("x".repeat(81))).toEqual({ error: "too_long" });
    expect(normalizeSearchQuery("  oat bars  ")).toEqual({ query: "oat bars" });
  });

  it("caps result limits at 24", () => {
    expect(clampSearchLimit(100)).toBe(24);
    expect(clampSearchLimit(0)).toBe(24);
    expect(clampSearchLimit(5)).toBe(5);
  });

  it("emits a finished public status, trust, freshness, and image fields", () => {
    const card = mapLiveSearchCard({
      id: "prod-1",
      slug: "plain-oat-bars",
      brand: "Example",
      name: "Oat Bars",
      variant: null,
      size: "6 oz",
      category: "bars",
      image_url: "https://example.test/oat.png",
      image_attribution: "Manufacturer",
      ingredient_status: "VERIFY",
      verification_status: "PACKAGE_VERIFIED",
      last_verified_at: "2026-08-01T00:00:00.000Z",
      freshness_state: "CURRENT",
      formulation_conflict: false,
      ruleset_hash: "hash",
    });
    expect(card.ingredientStatus).toBe("VERIFY");
    expect(card.verificationStatus).toBe("PACKAGE_VERIFIED");
    expect(card.freshnessState).toBe("CURRENT");
    expect(card.imageUrl).toBe("https://example.test/oat.png");
    expect(card.imageAttribution).toBe("Manufacturer");
  });
});
