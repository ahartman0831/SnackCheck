import { describe, expect, it } from "vitest";
import {
  assessClassroomRelevance,
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
  it("requires a product-format match for broad source categories", () => {
    expect(classifyShortlistCategory("Biscuits/Cookies", "Cheddar crackers")).toBe(
      "SNACKS",
    );
    expect(classifyShortlistCategory("Biscuits/Cookies", "Oat cookies")).toBe("TREATS");
    expect(classifyShortlistCategory("Snacks", "White cheddar popcorn")).toBe("SNACKS");
    expect(
      classifyShortlistCategory(
        "Processed Cereal Products",
        "Soft Baked Apple Streusel Bars",
      ),
    ).toBe("SNACKS");
    expect(
      classifyShortlistCategory("Processed Cereal Products", "Whole grain rice"),
    ).toBeNull();
    expect(classifyShortlistCategory("Snacks", "Unspecified product")).toBeNull();
    expect(
      classifyShortlistCategory("Fruit - Prepared/Processed", "Applesauce cups"),
    ).toBe("LUNCHBOX");
    expect(
      classifyShortlistCategory("Fruit - Prepared/Processed", "Applesauce 6/10"),
    ).toBeNull();
  });

  it.each([
    ["Snacks", "Microwave popcorn mini bags", "1.5 ONZ"],
    ["Snacks", "White cheddar popcorn seasoning", "2.6 ONZ"],
    ["Snacks", "Unpopped popcorn kernels", "12 ONZ"],
    ["Biscuits/Cookies", "Cracker baking flour", "8 ONZ"],
    ["Biscuits/Cookies", "Crackers 4oz 50ct", "12.5 LBR"],
    ["Processed Cereal Products", "Cereal bars 96ct", "148.8 ONZ"],
  ])(
    "excludes preparation products and bulk cases: %s / %s",
    (category, productName, size) => {
      expect(
        assessClassroomRelevance(candidate(1, category, { productName, size })),
      ).toMatchObject({ tier: "EXCLUDED", route: "DEPRIORITIZED" });
    },
  );

  it("queues a broad-category ready-to-eat pack but preserves source categories", () => {
    const snack = candidate(1, "Snacks", {
      productName: "Kettle corn snack packs",
      size: "6.7 ONZ",
    });
    const rows = selectCatalogShortlist([snack], 10);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      category: "Snacks",
      group: "SNACKS",
      relevance: { version: "classroom-use-v3", route: "AUTO_EVIDENCE" },
    });
  });

  it("does not use the brand or ingredient-search match as product-format evidence", () => {
    expect(
      assessClassroomRelevance(
        candidate(1, "Processed Cereal Products", {
          brand: "Snack Bar Company",
          productName: "Baking mix",
        }),
      ),
    ).toMatchObject({ route: "DEPRIORITIZED" });
    expect(
      assessClassroomRelevance(
        candidate(2, "Meat/Poultry/Other Animals - Prepared/Processed", {
          productName: "Beef patties made with applesauce",
        }),
      ),
    ).toMatchObject({ route: "DEPRIORITIZED" });
  });

  it("keeps uncertain broad-category ingredients out of automatic evidence", () => {
    expect(
      assessClassroomRelevance(
        candidate(1, "Snacks", {
          productName: "White cheddar popcorn",
          screenStatus: "VERIFY",
          qualityFlags: ["PARSER_WARNING"],
        }),
      ),
    ).toMatchObject({ route: "HUMAN_EXCEPTION" });
  });

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
    expect(classifyShortlistCategory("Honey")).toBeNull();
    expect(classifyShortlistCategory("Jam, Jelly & Fruit Spreads")).toBeNull();
  });

  it("routes portable snacks to evidence automation and pantry items away", () => {
    expect(
      assessClassroomRelevance(
        candidate(1, "Chips, Pretzels & Snacks", {
          productName: "Single-serve pretzel snack packs",
        }),
      ),
    ).toMatchObject({ tier: "HIGH", route: "AUTO_EVIDENCE", group: "SNACKS" });
    expect(
      assessClassroomRelevance(candidate(2, "Honey", { productName: "Pure raw honey" })),
    ).toMatchObject({ tier: "EXCLUDED", route: "DEPRIORITIZED", group: null });
    expect(
      assessClassroomRelevance(
        candidate(3, "Popcorn, Peanuts, Seeds & Related Snacks", {
          brand: "Example Foodservice",
          productName: "Bulk popcorn",
        }),
      ),
    ).toMatchObject({ tier: "EXCLUDED", route: "DEPRIORITIZED" });
  });

  it("sends ingredient uncertainty to the exception queue instead of automation", () => {
    expect(
      assessClassroomRelevance(
        candidate(1, "Snack, Energy & Granola Bars", {
          productName: "Chocolate granola snack bar",
          screenStatus: "VERIFY",
        }),
      ),
    ).toMatchObject({ tier: "HIGH", route: "HUMAN_EXCEPTION" });
  });

  it("does not create human work for a classroom-irrelevant uncertain record", () => {
    expect(
      assessClassroomRelevance(
        candidate(1, "Honey", {
          productName: "Pure honey",
          screenStatus: "VERIFY",
          qualityFlags: ["PARSER_WARNING"],
        }),
      ),
    ).toMatchObject({ tier: "EXCLUDED", route: "DEPRIORITIZED" });
  });

  it("rejects unsafe states and quality warnings", () => {
    const rows = [
      candidate(1, "Chips, Pretzels & Snacks", { productName: "Pretzel snack" }),
      candidate(2, "Chips, Pretzels & Snacks", {
        productName: "Pretzel snack",
        screenStatus: "VERIFY",
      }),
      candidate(3, "Chips, Pretzels & Snacks", {
        productName: "Pretzel snack",
        candidateState: "REVIEW_QUEUED",
      }),
      candidate(4, "Chips, Pretzels & Snacks", {
        productName: "Pretzel snack",
        discontinued: true,
      }),
      candidate(5, "Chips, Pretzels & Snacks", {
        productName: "Pretzel snack",
        qualityFlags: ["PARSER_WARNING"],
      }),
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
    const names = [
      "Individual pretzel snack packs",
      "Mini cereal snack cups",
      "Single-serve cheese snack pack",
      "Juice drink boxes",
      "Mini sandwich cookies",
    ];
    const rows = Array.from({ length: 250 }, (_, index) =>
      candidate(index + 1, categories[index % categories.length] ?? "Other", {
        productName: names[index % names.length] ?? "Classroom snack",
      }),
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
