import { beforeEach, describe, expect, it, vi } from "vitest";

const searchProducts = vi.fn();
const recordEvent = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/products/repository", () => ({
  searchProducts: (...args: unknown[]) => searchProducts(...args),
}));
vi.mock("@/lib/analytics/events", () => ({
  recordEvent: (...args: unknown[]) => recordEvent(...args),
}));
vi.mock("@/lib/rate-limit", () => ({
  getRateLimiter: async () => ({
    limit: async () => ({ success: true }),
  }),
}));

import { GET } from "../../app/api/v1/search/route";

describe("GET /api/v1/search", () => {
  beforeEach(() => {
    searchProducts.mockReset();
    recordEvent.mockReset();
  });

  it("rejects malformed short queries", async () => {
    const response = await GET(new Request("http://localhost/api/v1/search?q=x"));
    expect(response.status).toBe(400);
    expect(searchProducts).not.toHaveBeenCalled();
  });

  it("returns status, trust, freshness, and image fields for a parameterized query", async () => {
    searchProducts.mockResolvedValue([
      {
        id: "prod-1",
        slug: "plain-oat-bars",
        brand: "Example",
        name: "Oat Bars",
        variant: null,
        size: "6 oz",
        category: "bars",
        imageUrl: "https://example.test/oat.png",
        imageAttribution: "Manufacturer",
        ingredientStatus: "VERIFY",
        verificationStatus: "PACKAGE_VERIFIED",
        lastVerifiedAt: "2026-08-01T00:00:00.000Z",
        freshnessState: "CURRENT",
        formulationConflict: false,
        rulesetHash: "hash",
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/v1/search?q=oat%20bars&limit=10&cursorId="),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0].ingredientStatus).toBe("VERIFY");
    expect(body.data[0].verificationStatus).toBe("PACKAGE_VERIFIED");
    expect(body.data[0].freshnessState).toBe("CURRENT");
    expect(body.data[0].imageUrl).toBe("https://example.test/oat.png");
    expect(searchProducts).toHaveBeenCalledWith("oat bars", expect.any(Object));
  });
});
