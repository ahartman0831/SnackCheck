import { describe, expect, it, vi } from "vitest";
import type { EvidenceCandidate } from "@/lib/catalog-evidence/collector";
import { collectCatalogEvidence } from "@/lib/catalog-evidence/collector";
import { ManufacturerEvidenceAdapter } from "@/lib/catalog-evidence/manufacturer-adapter";
import { parseManufacturerManifest } from "@/lib/catalog-evidence/manufacturer-manifest";
import { extractManufacturerPageSnapshot } from "@/lib/catalog-evidence/manufacturer-page";

const candidate: EvidenceCandidate = {
  id: "01124853-12d7-4810-bde3-b828a156ee54",
  provider: "USDA_FDC",
  brand: "Fixture Foods",
  productName: "Pretzel Bites",
  variant: null,
  size: "1 oz",
  normalizedGtin14: "00012345678905",
  manufacturerHosts: ["fixturefoods.example"],
};

const manifestValue = [
  {
    candidateId: candidate.id,
    normalizedGtin14: candidate.normalizedGtin14,
    sourceUrl: "https://www.fixturefoods.example/products/pretzel-bites",
    manufacturerHost: "fixturefoods.example",
    termsStatus: "ALLOWED",
    termsReviewedAt: "2026-09-01T00:00:00.000Z",
    termsReferenceUrl: "https://fixturefoods.example/terms",
  },
];

describe("manufacturer evidence manifest", () => {
  it("rejects redirects before an unreviewed target can be requested", async () => {
    const manifest = parseManufacturerManifest(manifestValue, {
      now: new Date("2026-09-07T00:00:00.000Z"),
    });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/private" },
      }),
    );
    const adapter = new ManufacturerEvidenceAdapter(manifest, {
      userAgent: "SnackCheck/0.1 (owner@example.test)",
      fetcher,
    });
    await expect(
      adapter.retrieve(
        { url: manifest[0].sourceUrl.replace("www.", ""), title: "test" },
        { maxBytes: 1000, signal: new AbortController().signal },
      ),
    ).rejects.toThrow("HTTP 302");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1].redirect).toBe("error");
  });
  it("requires an exact candidate, barcode, reviewed host, and current terms review", () => {
    expect(
      parseManufacturerManifest(manifestValue, {
        now: new Date("2026-09-07T00:00:00.000Z"),
      }),
    ).toHaveLength(1);

    expect(() =>
      parseManufacturerManifest(
        [{ ...manifestValue[0], sourceUrl: "https://retailer.example/item" }],
        { now: new Date("2026-09-07T00:00:00.000Z") },
      ),
    ).toThrow("reviewed host");
    expect(() =>
      parseManufacturerManifest(manifestValue, {
        now: new Date("2028-09-07T00:00:00.000Z"),
      }),
    ).toThrow("stale");
  });
});

describe("manufacturer page extraction", () => {
  it("extracts bounded product facts from Product JSON-LD", () => {
    const snapshot = extractManufacturerPageSnapshot(
      `<html><head><script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Pretzel Bites",
        brand: { "@type": "Brand", name: "Fixture Foods" },
        gtin14: "00012345678905",
        size: "1 oz",
        ingredients: "Wheat flour, salt",
      })}</script></head></html>`,
      "text/html",
    );
    expect(snapshot).toEqual({
      productName: "Pretzel Bites",
      brand: "Fixture Foods",
      gtins: ["00012345678905"],
      quantity: "1 oz",
      ingredientText: "Wheat flour, salt",
    });
  });

  it("uses visible ingredient text only when structured ingredients are absent", () => {
    expect(
      extractManufacturerPageSnapshot(
        "<title>Pretzel Bites</title><main>Ingredients: Wheat flour, salt. Nutrition Facts 100 calories</main>",
        "text/html",
      ),
    ).toMatchObject({
      productName: "Pretzel Bites",
      ingredientText: "Wheat flour, salt.",
    });
  });

  it("chooses the actual labeled ingredient section instead of page navigation", () => {
    expect(
      extractManufacturerPageSnapshot(
        `<nav>Bulk & Ingredients Log in Search Site navigation Cart</nav>
         <main>Ingredients: Apricots, sulfur dioxide. Nutrition Facts 90 calories</main>`,
        "text/html",
      ),
    ).toMatchObject({ ingredientText: "Apricots, sulfur dioxide." });
  });

  it("does not confuse an Ingredients or Less recipe link with a product label", () => {
    expect(
      extractManufacturerPageSnapshot(
        `<nav>Recipes 5 Ingredients or Less Slow Cooker Seasonal</nav>
         <main>Ingredients Pasteurized Milk, Jalapeno Peppers, Salt. Nutritional Facts</main>`,
        "text/html",
      ),
    ).toMatchObject({
      ingredientText: "Pasteurized Milk, Jalapeno Peppers, Salt.",
    });
  });

  it("trims manufacturer copy and allergen/footer text around ingredients", () => {
    expect(
      extractManufacturerPageSnapshot(
        `<main>Feelin' spicy? SIMPLE INGREDIENTS: Almonds, sunflower seeds,
        flax seeds, sea salt. CONTAINS: Almonds. Terms and Conditions</main>`,
        "text/html",
      ),
    ).toMatchObject({
      ingredientText: "Almonds, sunflower seeds, flax seeds, sea salt.",
    });
  });

  it("returns no ingredient evidence for SmartLabel boilerplate", () => {
    expect(
      extractManufacturerPageSnapshot(
        `<main>Product Information Can Change At Any Time. Please Refer To Your Product
        Label For The Most Accurate Nutrition, Ingredient, Allergen And Other Product
        Information. Information updated on 14-Sep-2023. Privacy Policy.</main>`,
        "text/html",
      ),
    ).toMatchObject({ ingredientText: null });
  });
});

describe("manufacturer evidence adapter", () => {
  it("collects only the manifest-bound official page and preserves provenance", async () => {
    const manifest = parseManufacturerManifest(manifestValue, {
      now: new Date("2026-09-07T00:00:00.000Z"),
    });
    const fetched = new Response(
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Pretzel Bites",
        gtin14: candidate.normalizedGtin14,
        ingredients: "Wheat flour, salt",
      })}</script>`,
      { status: 200, headers: { "content-type": "text/html" } },
    );
    Object.defineProperty(fetched, "url", { value: manifest[0].sourceUrl });
    const fetcher = vi.fn().mockResolvedValue(fetched);
    const result = await collectCatalogEvidence({
      runId: "manufacturer-test",
      candidates: [candidate],
      adapter: new ManufacturerEvidenceAdapter(manifest, {
        userAgent: "SnackCheck/0.1 (owner@example.test)",
        fetcher,
        now: () => Date.parse("2026-09-07T00:00:00.000Z"),
      }),
      limits: { maxRequestsPerCandidate: 1, maxRequestsPerRun: 1 },
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ requestsMade: 1, evidenceFound: 1 });
    expect(result.attempts[0].evidence).toMatchObject({
      sourceKind: "MANUFACTURER",
      hostname: "fixturefoods.example",
      ingredientText: "Wheat flour, salt",
    });
  });

  it("refuses a manifest barcode mismatch before making a request", async () => {
    const fetcher = vi.fn();
    const manifest = parseManufacturerManifest(
      [{ ...manifestValue[0], normalizedGtin14: "00012345678912" }],
      { now: new Date("2026-09-07T00:00:00.000Z") },
    );
    const result = await collectCatalogEvidence({
      runId: "manufacturer-mismatch",
      candidates: [candidate],
      adapter: new ManufacturerEvidenceAdapter(manifest, {
        userAgent: "SnackCheck/0.1 (owner@example.test)",
        fetcher,
      }),
      limits: { maxRequestsPerCandidate: 1, maxRequestsPerRun: 1 },
    });
    expect(result.attempts[0]).toMatchObject({
      outcome: "ERROR",
      reasonCode: "ADAPTER_ERROR",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("blocks a manufacturer page that declares a different barcode", async () => {
    const manifest = parseManufacturerManifest(manifestValue, {
      now: new Date("2026-09-07T00:00:00.000Z"),
    });
    const fetched = new Response(
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Different Product",
        gtin14: "00012345678912",
      })}</script>`,
      { status: 200, headers: { "content-type": "text/html" } },
    );
    Object.defineProperty(fetched, "url", { value: manifest[0].sourceUrl });
    const result = await collectCatalogEvidence({
      runId: "manufacturer-page-mismatch",
      candidates: [candidate],
      adapter: new ManufacturerEvidenceAdapter(manifest, {
        userAgent: "SnackCheck/0.1 (owner@example.test)",
        fetcher: vi.fn().mockResolvedValue(fetched),
      }),
      limits: { maxRequestsPerCandidate: 1, maxRequestsPerRun: 1 },
    });
    expect(result.attempts[0]).toMatchObject({
      outcome: "BLOCKED_BY_POLICY",
      reasonCode: "MANUFACTURER_GTIN_MISMATCH",
    });
  });

  it("preserves an exact GTIN encoded in an official product URL", async () => {
    const urlManifest = parseManufacturerManifest(
      [
        {
          ...manifestValue[0],
          sourceUrl:
            "https://fixturefoods.example/smartlabel/012345678905-product/index.html",
        },
      ],
      { now: new Date("2026-09-07T00:00:00.000Z") },
    );
    const fetched = new Response("<title>Pretzel Bites</title>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
    Object.defineProperty(fetched, "url", { value: urlManifest[0].sourceUrl });
    const result = await collectCatalogEvidence({
      runId: "manufacturer-url-gtin",
      candidates: [candidate],
      adapter: new ManufacturerEvidenceAdapter(urlManifest, {
        userAgent: "SnackCheck/0.1 (owner@example.test)",
        fetcher: vi.fn().mockResolvedValue(fetched),
      }),
      limits: { maxRequestsPerCandidate: 1, maxRequestsPerRun: 1 },
    });
    expect(JSON.parse(result.attempts[0].evidence?.evidenceText ?? "{}")).toMatchObject({
      gtins: ["012345678905"],
    });
  });
});
