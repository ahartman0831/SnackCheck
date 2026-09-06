import { describe, expect, it, vi } from "vitest";
import type { EvidenceCandidate } from "@/lib/catalog-evidence/collector";
import { OpenFoodFactsEvidenceAdapter } from "@/lib/catalog-evidence/open-food-facts-adapter";

const candidate: EvidenceCandidate = {
  id: "candidate-1",
  provider: "USDA_FDC",
  brand: "Fixture Foods",
  productName: "Pretzel Bites",
  variant: null,
  size: "1 oz",
  normalizedGtin14: "00012345678905",
  manufacturerHosts: [],
};

function response(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

describe("Open Food Facts evidence adapter", () => {
  it("builds one exact-barcode reference without a search request", async () => {
    const adapter = new OpenFoodFactsEvidenceAdapter({
      userAgent: "SnackCheck/0.1 (owner@example.test)",
      fetcher: vi.fn(),
    });
    const result = await adapter.discover(candidate, {
      maxResults: 5,
      signal: new AbortController().signal,
    });
    expect(result.requestCount).toBe(0);
    expect(result.references[0].url).toContain("/api/v3/product/12345678905?");
  });

  it("retrieves a bounded attributed secondary record", async () => {
    const fetched = response({
      status: 1,
      product: {
        code: "12345678905",
        product_name: "Pretzel Bites",
        brands: "Fixture Foods",
        quantity: "1 oz",
        ingredients_text_en: "Wheat flour, salt",
        last_modified_t: 1_788_134_400,
      },
    });
    Object.defineProperty(fetched, "url", {
      value: "https://world.openfoodfacts.org/api/v3/product/12345678905",
    });
    const fetcher = vi.fn().mockResolvedValue(fetched);
    const adapter = new OpenFoodFactsEvidenceAdapter({
      userAgent: "SnackCheck/0.1 (owner@example.test)",
      fetcher,
      now: () => Date.parse("2026-09-06T00:00:00Z"),
    });
    const reference = (
      await adapter.discover(candidate, {
        maxResults: 1,
        signal: new AbortController().signal,
      })
    ).references[0];
    const result = await adapter.retrieve(reference, {
      maxBytes: 10_000,
      signal: new AbortController().signal,
    });
    expect(fetcher).toHaveBeenCalledWith(
      reference.url,
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "SnackCheck/0.1 (owner@example.test)",
        }),
      }),
    );
    expect(result).toMatchObject({
      requestCount: 1,
      evidence: {
        ingredientText: "Wheat flour, salt",
        licenseIdentifier: "ODbL-1.0; DbCL-1.0",
        attribution: "Open Food Facts contributors",
      },
    });
  });

  it("returns not found without manufacturing evidence", async () => {
    const adapter = new OpenFoodFactsEvidenceAdapter({
      userAgent: "SnackCheck/0.1 (owner@example.test)",
      fetcher: vi.fn().mockResolvedValue(new Response("", { status: 404 })),
    });
    const result = await adapter.retrieve(
      { url: "https://world.openfoodfacts.org/api/v3/product/1", title: "OFF" },
      { maxBytes: 100, signal: new AbortController().signal },
    );
    expect(result).toEqual({ requestCount: 1, evidence: null });
  });

  it("requires identification and stops oversized responses", async () => {
    expect(() => new OpenFoodFactsEvidenceAdapter({ userAgent: "anonymous" })).toThrow(
      "User-Agent",
    );
    const adapter = new OpenFoodFactsEvidenceAdapter({
      userAgent: "SnackCheck/0.1 (owner@example.test)",
      fetcher: vi
        .fn()
        .mockResolvedValue(response({ product: { product_name: "Large" } })),
    });
    await expect(
      adapter.retrieve(
        { url: "https://world.openfoodfacts.org/api/v3/product/1", title: "OFF" },
        { maxBytes: 5, signal: new AbortController().signal },
      ),
    ).rejects.toThrow("byte limit");
  });
});
