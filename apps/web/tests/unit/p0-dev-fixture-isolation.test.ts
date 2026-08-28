import { describe, expect, it } from "vitest";
import {
  isDevCatalogAllowed,
  isDevUiEnabled,
  productMissFallback,
} from "../../lib/products/lookup-policy";

describe("P0-4 development fixture isolation", () => {
  it("cannot enable the labeled development catalog in production", () => {
    expect(isDevCatalogAllowed("production", "true")).toBe(false);
  });

  it("hides the development UI gallery in production and allows it otherwise", () => {
    expect(isDevUiEnabled("production")).toBe(false);
    expect(isDevUiEnabled("development")).toBe(true);
    expect(isDevUiEnabled("test")).toBe(true);
  });

  it("must not return a labeledDevelopmentFixture after a production DB miss", () => {
    const decision = productMissFallback({
      nodeEnv: "production",
      hasAdminClient: true,
      dbHit: false,
    });
    expect(decision).toBe("not-found");
  });

  it("must not fall through to the dev catalog when production has no admin client", () => {
    expect(
      productMissFallback({
        nodeEnv: "production",
        hasAdminClient: false,
        dbHit: false,
      }),
    ).toBe("not-found");
  });
});
