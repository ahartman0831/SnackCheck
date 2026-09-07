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
});
