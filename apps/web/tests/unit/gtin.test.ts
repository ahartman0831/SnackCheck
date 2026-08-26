import { describe, expect, it } from "vitest";
import { normalizeGtin } from "../../lib/gtin";

describe("GTIN", () => {
  it("accepts a valid UPC-A and pads to GTIN-14", () => {
    const result = normalizeGtin("036000291452");
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.format).toBe("UPC_A");
    expect(result.gtin14).toHaveLength(14);
  });

  it("rejects an invalid check digit and never treats it as found", () => {
    const result = normalizeGtin("036000291453");
    expect("error" in result).toBe(true);
  });
});
