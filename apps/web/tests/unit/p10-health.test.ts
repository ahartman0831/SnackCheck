import { describe, expect, it } from "vitest";
import {
  bearerTokenMatches,
  productionFeaturesAreOff,
  readinessStatus,
} from "@/lib/observability/health";

describe("Phase 10 operational health", () => {
  it("requires an exact bearer token", () => {
    const token = "a".repeat(32);
    expect(bearerTokenMatches(`Bearer ${token}`, token)).toBe(true);
    expect(bearerTokenMatches(`Bearer ${"b".repeat(32)}`, token)).toBe(false);
    expect(bearerTokenMatches(null, token)).toBe(false);
    expect(bearerTokenMatches(`Bearer ${token}`, undefined)).toBe(false);
  });

  it("fails the production readiness gate when any launch feature is enabled", () => {
    expect(
      productionFeaturesAreOff({ VERCEL_ENV: "preview", FEATURE_BARCODE_CAMERA: "true" }),
    ).toBe(true);
    expect(productionFeaturesAreOff({ VERCEL_ENV: "production" })).toBe(true);
    expect(
      productionFeaturesAreOff({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_FEATURE_INGREDIENT_PHOTO: "true",
      }),
    ).toBe(false);
  });

  it("reports degraded if any required readiness check fails", () => {
    expect(
      readinessStatus({
        database: true,
        photoPipelineStopped: true,
        aiExtractionStopped: true,
        productionFeaturesOff: true,
      }),
    ).toBe("ok");
    expect(
      readinessStatus({
        database: true,
        photoPipelineStopped: false,
        aiExtractionStopped: true,
        productionFeaturesOff: true,
      }),
    ).toBe("degraded");
  });
});
