type FeatureEnv = Record<string, string | undefined>;

export function isBarcodeCameraEnabled(env?: FeatureEnv): boolean {
  const source = env ?? process.env;
  return (
    source.FEATURE_BARCODE_CAMERA === "true" ||
    source.NEXT_PUBLIC_FEATURE_BARCODE_CAMERA === "true"
  );
}

export function isIngredientPhotoEnabled(env?: FeatureEnv): boolean {
  const source = env ?? process.env;
  return (
    source.FEATURE_INGREDIENT_PHOTO === "true" ||
    source.FEATURE_PHOTO_EXTRACTION === "true" ||
    source.NEXT_PUBLIC_FEATURE_INGREDIENT_PHOTO === "true"
  );
}
