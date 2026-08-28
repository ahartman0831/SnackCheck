import { isBarcodeCameraEnabled, isIngredientPhotoEnabled } from "./features";

type FeatureEnv = Record<string, string | undefined>;

export function barcodeActionLabel(env?: FeatureEnv): string {
  return isBarcodeCameraEnabled(env) ? "Scan a barcode" : "Enter a barcode";
}

export function barcodePageTitle(env?: FeatureEnv): string {
  return barcodeActionLabel(env);
}

export function ingredientActionLabel(env?: FeatureEnv): string {
  return isIngredientPhotoEnabled(env) ? "Photograph ingredients" : "Paste ingredients";
}

export function ingredientPageTitle(env?: FeatureEnv): string {
  return isIngredientPhotoEnabled(env)
    ? "Photograph ingredients"
    : "Check an ingredient list";
}

export function barcodeNavLabel(env?: FeatureEnv): string {
  return isBarcodeCameraEnabled(env) ? "Scan" : "Barcode";
}

export const APP_TAGLINE = "Scan it. Search it. Know before you bring it.";
export const APP_SUPPORTING =
  "Check packaged-food ingredients against Arizona’s school distribution rules.";
export const APPROVED_HEADING = "Products that pass the Arizona ingredient check";
export const APPROVED_FORBIDDEN = [
  "school-safe",
  "allergy-safe",
  "Arizona-approved",
  "approved by the state",
  "guaranteed allowed",
] as const;
