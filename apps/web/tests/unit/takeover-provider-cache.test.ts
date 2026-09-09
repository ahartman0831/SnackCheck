import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ external: vi.fn() }));
vi.mock("@/lib/products/repository", () => ({ getProductByGtin: async () => null }));
vi.mock("@/lib/providers/open-food-facts-provider", () => ({
  OpenFoodFactsProvider: class {
    getByGtin = mocks.external;
  },
}));
import { lookupGtin } from "@/lib/providers/provider-chain";
afterEach(() => vi.clearAllMocks());

describe("barcode provider recovery", () => {
  it("retries after an outage instead of caching it for twelve hours", async () => {
    mocks.external
      .mockResolvedValueOnce({ kind: "UNAVAILABLE" })
      .mockResolvedValueOnce({ kind: "NOT_FOUND" });
    expect((await lookupGtin("00000000000017")).result.kind).toBe("UNAVAILABLE");
    expect((await lookupGtin("00000000000017")).result.kind).toBe("NOT_FOUND");
    expect((await lookupGtin("00000000000017")).source).toBe("cache");
    expect(mocks.external).toHaveBeenCalledTimes(2);
  });
});
