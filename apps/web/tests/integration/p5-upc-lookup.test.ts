import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupGtin = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/providers/provider-chain", () => ({
  lookupGtin: (...args: unknown[]) => lookupGtin(...args),
}));
vi.mock("@/lib/rate-limit", () => ({
  getRateLimiter: async () => ({
    limit: async () => ({ success: true }),
  }),
}));

import { GET } from "../../app/api/v1/upc/[gtin]/route";

describe("GET /api/v1/upc/[gtin]", () => {
  beforeEach(() => {
    lookupGtin.mockReset();
  });

  it("does not call the provider chain for an invalid check digit", async () => {
    const response = await GET(new Request("http://localhost/api/v1/upc/036000291453"), {
      params: Promise.resolve({ gtin: "036000291453" }),
    });
    expect(response.status).toBe(400);
    expect(lookupGtin).not.toHaveBeenCalled();
  });

  it("returns an internal slug for a known GTIN", async () => {
    lookupGtin.mockResolvedValue({
      source: "internal",
      result: { kind: "INTERNAL", slug: "plain-oat-bars" },
    });
    const response = await GET(new Request("http://localhost/api/v1/upc/036000291452"), {
      params: Promise.resolve({ gtin: "036000291452" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.lookup.result.slug).toBe("plain-oat-bars");
  });
});
