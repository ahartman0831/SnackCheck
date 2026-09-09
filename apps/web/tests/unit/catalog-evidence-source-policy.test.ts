import { describe, expect, it } from "vitest";
import { assessEvidenceSource } from "@/lib/catalog-evidence/source-policy";

describe("catalog evidence source policy", () => {
  it("accepts an allowlisted manufacturer and normalizes its URL", () => {
    expect(
      assessEvidenceSource("https://www.fixturefoods.example/snacks#ingredients", [
        "fixturefoods.example",
      ]),
    ).toEqual({
      accepted: true,
      kind: "MANUFACTURER",
      normalizedUrl: "https://fixturefoods.example/snacks",
      hostname: "fixturefoods.example",
    });
  });

  it("allows OFF only as secondary evidence", () => {
    expect(
      assessEvidenceSource("https://world.openfoodfacts.org/product/123", []),
    ).toMatchObject({
      accepted: true,
      kind: "SECONDARY",
    });
  });

  it.each([
    ["http://fixturefoods.example/item", "INSECURE_URL"],
    ["https://user:pass@fixturefoods.example/item", "CREDENTIALS_IN_URL"],
    ["https://fixturefoods.example:8443/item", "NON_STANDARD_PORT"],
    ["https://google.com/search?q=snack", "SEARCH_OR_SOCIAL_HOST"],
    ["https://www.amazon.com/item", "RETAILER_HOST"],
    ["https://unverified.example/item", "HOST_NOT_ALLOWED"],
  ])("rejects %s", (url, reason) => {
    expect(assessEvidenceSource(url, ["fixturefoods.example"])).toEqual({
      accepted: false,
      reason,
    });
  });
});
