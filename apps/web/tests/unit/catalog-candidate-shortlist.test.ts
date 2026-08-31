import { describe, expect, it } from "vitest";
import {
  classifyShortlistCategory,
  selectCatalogShortlist,
  type ShortlistCandidate,
} from "@/lib/catalog-candidates/shortlist";

function candidate(
  id: number,
  category: string,
  overrides: Partial<ShortlistCandidate> = {},
): ShortlistCandidate {
  return {
    id: `00000000-0000-4000-8000-${id.toString().padStart(12, "0")}`,
    brand: `Brand ${id % 10}`,
    productName: `Product ${id}`,
    category,
    variant: null,
    size: `${id + 1} oz`,
    normalizedGtin14: id.toString().padStart(14, "0"),
    sourceModifiedAt: `2026-08-${String((id % 28) + 1).padStart(2, "0")}T00:00:00Z`,
    sourcePublishedAt: null,
    qualityFlags: [],
    screenStatus: "PASS",
    candidateState: "SCREENED_PASS",
    discontinued: false,
    ...overrides,
  };
}

describe("catalog candidate shortlist", () => {
  it("maps only useful school-food categories", () => {
    expect(classifyShortlistCategory("Chips, Pretzels & Snacks")).toBe("SNACKS");
    expect(classifyShortlistCategory("Cereal")).toBe("BREAKFAST");
    expect(classifyShortlistCategory("Cheese")).toBe("LUNCHBOX");
    expect(
      classifyShortlistCategory("Fruit & Vegetable Juice, Nectars & Fruit Drinks"),
    ).toBe("DRINKS");
    expect(classifyShortlistCategory("Cookies & Biscuits")).toBe("TREATS");
    expect(classifyShortlistCategory("Alcohol")).toBeNull();
    expect(classifyShortlistCategory("Seasoning Mixes")).toBeNull();
    expect(classifyShortlistCategory("Cake, Cookie & Cupcake Mixes")).toBeNull();
    expect(classifyShortlistCategory("Frozen Bread & Dough")).toBeNull();
  });

  it("rejects unsafe states and quality warnings", () => {
    const rows = [
      candidate(1, "Cereal"),
      candidate(2, "Cereal", { screenStatus: "VERIFY" }),
      candidate(3, "Cereal", { candidateState: "REVIEW_QUEUED" }),
      candidate(4, "Cereal", { discontinued: true }),
      candidate(5, "Cereal", { qualityFlags: ["PARSER_WARNING"] }),
    ];
    expect(selectCatalogShortlist(rows, 10).map((row) => row.id)).toEqual([rows[0]?.id]);
  });

  it("balances groups and caps the output at 200 deterministically", () => {
    const categories = [
      "Chips, Pretzels & Snacks",
      "Cereal",
      "Cheese",
      "Sport Drinks",
      "Cookies & Biscuits",
    ];
    const rows = Array.from({ length: 250 }, (_, index) =>
      candidate(index + 1, categories[index % categories.length] ?? "Other"),
    );
    const first = selectCatalogShortlist(rows, 250);
    const second = selectCatalogShortlist([...rows].reverse(), 250);
    expect(first).toHaveLength(200);
    expect(second.map((row) => row.id)).toEqual(first.map((row) => row.id));
    expect(new Set(first.map((row) => row.group))).toEqual(
      new Set(["SNACKS", "BREAKFAST", "LUNCHBOX", "DRINKS", "TREATS"]),
    );
  });
});
