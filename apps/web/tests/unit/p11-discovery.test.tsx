import { render, screen } from "@testing-library/react";
import type { PublicProductCard } from "@snackcheck/contracts";
import { describe, expect, it } from "vitest";
import { ProductResultCard } from "../../components/public/product-result-card";
import {
  categoryLabel,
  discoveryHref,
  filterDiscoveryProducts,
  formatEvidenceDate,
  parseDiscoveryFilters,
} from "../../lib/products/discovery";

const card: PublicProductCard = {
  id: "product-1",
  slug: "plain-crackers",
  brand: "Example",
  name: "Plain Crackers",
  variant: "Sea salt",
  size: "8 packs",
  category: "crackers",
  imageUrl: null,
  imageAttribution: null,
  ingredientStatus: "PASS",
  verificationStatus: "VERIFIED",
  lastVerifiedAt: "2026-08-01T00:00:00.000Z",
  freshnessState: "CURRENT",
  formulationConflict: false,
  rulesetHash: "published-hash",
  individuallyPackaged: true,
  evidenceTitle: "Manufacturer product page",
  evidenceUrl: "https://manufacturer.example/products/plain-crackers",
  evidenceObservedAt: "2026-08-02T00:00:00.000Z",
};

describe("Phase 11 public discovery", () => {
  it("normalizes only supported filters", () => {
    expect(
      parseDiscoveryFilters({
        category: " crackers ",
        verification: "VERIFIED",
        packaged: "yes",
      }),
    ).toEqual({
      category: "crackers",
      brand: undefined,
      verification: "VERIFIED",
      individuallyPackaged: true,
    });
    expect(
      parseDiscoveryFilters({ verification: "EXTERNAL_DATABASE", packaged: "no" }),
    ).toEqual({
      category: undefined,
      brand: undefined,
      verification: undefined,
      individuallyPackaged: undefined,
    });
  });

  it("filters only on supported public attributes", () => {
    expect(
      filterDiscoveryProducts([card], {
        category: "crackers",
        verification: "VERIFIED",
        individuallyPackaged: true,
      }),
    ).toEqual([card]);
    expect(filterDiscoveryProducts([card], { brand: "Other" })).toEqual([]);
  });

  it("builds encoded, shareable filter links", () => {
    expect(discoveryHref({ category: "snack bars", brand: "A&B", packaged: "yes" })).toBe(
      "/approved?category=snack+bars&brand=A%26B&packaged=yes",
    );
    expect(categoryLabel("fruit-snacks")).toBe("Fruit Snacks");
  });

  it("formats evidence dates consistently in UTC", () => {
    expect(formatEvidenceDate("2026-08-02T23:30:00-07:00")).toBe("Aug 3, 2026");
    expect(formatEvidenceDate("not-a-date")).toBeNull();
  });

  it("shows package format, evidence date, and source on a passing card", () => {
    render(<ProductResultCard item={card} />);
    expect(screen.getByRole("heading", { name: "Plain Crackers" })).toBeVisible();
    expect(screen.getByText("Individually packaged")).toBeVisible();
    expect(screen.getByText(/Evidence checked Aug 2, 2026/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Manufacturer product page" }),
    ).toHaveAttribute("href", "https://manufacturer.example/products/plain-crackers");
  });
});
