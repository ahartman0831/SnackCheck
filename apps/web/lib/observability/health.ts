import { timingSafeEqual } from "node:crypto";

type FeatureEnv = Record<string, string | undefined>;

export type ReadinessChecks = {
  database: boolean;
  photoPipelineStopped: boolean;
  aiExtractionStopped: boolean;
  productionFeaturesOff: boolean;
};

export function bearerTokenMatches(
  authorization: string | null,
  expected: string | undefined,
): boolean {
  if (!authorization?.startsWith("Bearer ") || !expected) return false;
  const supplied = authorization.slice("Bearer ".length);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

export function productionFeaturesAreOff(source: FeatureEnv = process.env): boolean {
  if (source.VERCEL_ENV !== "production") return true;
  return ![
    "FEATURE_BARCODE_CAMERA",
    "FEATURE_INGREDIENT_PHOTO",
    "FEATURE_PHOTO_EXTRACTION",
    "NEXT_PUBLIC_FEATURE_BARCODE_CAMERA",
    "NEXT_PUBLIC_FEATURE_INGREDIENT_PHOTO",
  ].some((name) => source[name] === "true");
}

export function readinessStatus(checks: ReadinessChecks): "ok" | "degraded" {
  return Object.values(checks).every(Boolean) ? "ok" : "degraded";
}
