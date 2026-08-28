import { describe, expect, it } from "vitest";
import { SearchQuerySchema } from "@snackcheck/contracts";
import { normalizeSearchQuery } from "../../lib/products/search-query";

describe("search API contracts", () => {
  it("accepts a parameterized public query and rejects malformed input", () => {
    expect(SearchQuerySchema.parse({ q: "oat bars", limit: 10 }).limit).toBe(10);
    expect(normalizeSearchQuery("%_")).toEqual({ query: "%_" });
    expect(() => SearchQuerySchema.parse({ q: "x" })).toThrow();
    expect(() => SearchQuerySchema.parse({ q: "ab", limit: 100 })).toThrow();
  });
});
