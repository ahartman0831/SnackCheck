import { beforeEach, describe, expect, it, vi } from "vitest";

const listApprovedDiscoveryProducts = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/products/repository", () => ({
  listApprovedDiscoveryProducts: (...args: unknown[]) =>
    listApprovedDiscoveryProducts(...args),
}));

import { GET } from "../../app/api/v1/products/approved/route";

describe("GET /api/v1/products/approved", () => {
  beforeEach(() => {
    listApprovedDiscoveryProducts.mockReset();
  });

  it("returns the live approved projection instead of a hard-coded empty array", async () => {
    listApprovedDiscoveryProducts.mockResolvedValue([]);
    const response = await GET(
      new Request("http://localhost/api/v1/products/approved?category=bars"),
    );
    expect(response.status).toBe(200);
    expect(listApprovedDiscoveryProducts).toHaveBeenCalledWith({
      category: "bars",
      brand: undefined,
      verification: undefined,
      individuallyPackaged: undefined,
    });
    const body = await response.json();
    expect(body.data).toEqual([]);
  });

  it("passes through current PASS cards with trust and freshness", async () => {
    listApprovedDiscoveryProducts.mockResolvedValue([
      {
        id: "prod-1",
        slug: "plain-oat-bars",
        brand: "Example",
        name: "Oat Bars",
        variant: null,
        size: "6 oz",
        category: "bars",
        imageUrl: null,
        imageAttribution: null,
        ingredientStatus: "PASS",
        verificationStatus: "VERIFIED",
        lastVerifiedAt: "2026-08-01T00:00:00.000Z",
        freshnessState: "CURRENT",
        formulationConflict: false,
        rulesetHash: "published-hash",
        individuallyPackaged: true,
        evidenceTitle: "Manufacturer page",
        evidenceUrl: "https://manufacturer.example/item",
        evidenceObservedAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
    const response = await GET(new Request("http://localhost/api/v1/products/approved"));
    const body = await response.json();
    expect(body.data[0].ingredientStatus).toBe("PASS");
    expect(body.data[0].verificationStatus).toBe("VERIFIED");
    expect(body.data[0].freshnessState).toBe("CURRENT");
    expect(body.data[0].rulesetHash).toBe("published-hash");
    expect(body.data[0].individuallyPackaged).toBe(true);
    expect(body.data[0].evidenceUrl).toBe("https://manufacturer.example/item");
  });
});
