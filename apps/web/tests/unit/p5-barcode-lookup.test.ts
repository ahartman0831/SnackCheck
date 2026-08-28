import { describe, expect, it, vi } from "vitest";
import {
  barcodeAttemptEvent,
  barcodeFallbackEvent,
  barcodeInvalidEvent,
  barcodeLookupEvent,
} from "../../lib/barcode/analytics";
import { lookupNormalizedGtin, routeForLookup } from "../../lib/barcode/lookup";

describe("barcode lookup routing", () => {
  it("rejects an invalid check digit without fetching", async () => {
    const fetchImpl = vi.fn();
    const result = await lookupNormalizedGtin("036000291453", { fetchImpl });
    expect(result.status).toBe("invalid");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(routeForLookup(result)).toBeNull();
  });

  it("routes a known product to its product page", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { lookup: { result: { slug: "plain-oat-bars" } } } }),
    });
    const result = await lookupNormalizedGtin("036000291452", { fetchImpl });
    expect(result).toEqual({
      status: "found",
      slug: "plain-oat-bars",
      gtin14: "00036000291452",
    });
    expect(routeForLookup(result)).toBe("/product/plain-oat-bars");
  });

  it("routes an unknown valid GTIN to the ingredient flow", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { lookup: { result: {} } } }),
    });
    const result = await lookupNormalizedGtin("036000291452", { fetchImpl });
    expect(result.status).toBe("unknown");
    expect(routeForLookup(result)).toBe("/scan/ingredients?gtin=00036000291452");
  });

  it("does not look up while offline", async () => {
    const fetchImpl = vi.fn();
    const result = await lookupNormalizedGtin("036000291452", {
      fetchImpl,
      online: false,
    });
    expect(result.status).toBe("offline");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("surfaces rate limits without inventing a product", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "Too many lookups." } }),
    });
    const result = await lookupNormalizedGtin("036000291452", { fetchImpl });
    expect(result.status).toBe("rate_limited");
    expect(routeForLookup(result)).toBeNull();
  });
});

describe("privacy-safe barcode analytics", () => {
  it("never includes a GTIN, image, or IP in event properties", () => {
    const events = [
      barcodeAttemptEvent(),
      barcodeInvalidEvent(),
      barcodeFallbackEvent(),
      barcodeLookupEvent({ status: "found", slug: "oat-bars", gtin14: "00036000291452" }),
      barcodeLookupEvent({ status: "unknown", gtin14: "00036000291452" }),
    ];
    for (const event of events) {
      expect(JSON.stringify(event)).not.toMatch(
        /00036000291452|gtin|image|frame|\d+\.\d+\.\d+\.\d+/i,
      );
    }
  });
});
