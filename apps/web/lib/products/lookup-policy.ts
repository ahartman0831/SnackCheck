export type ProductMissFallback = "not-found" | "dev-catalog";
export type ApprovedCatalogSource = "live-query" | "dev-catalog";

export function isDevCatalogAllowed(
  nodeEnv: string | undefined,
  enabledFlag: string | undefined,
): boolean {
  return nodeEnv !== "production" && enabledFlag === "true";
}

/** Development-only surfaces such as `/dev/ui`. Never available in production. */
export function isDevUiEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}

/** Production never falls through to labeled fixtures. */
export function productMissFallback(input: {
  nodeEnv: string;
  hasAdminClient: boolean;
  dbHit: boolean;
}): ProductMissFallback {
  if (input.nodeEnv === "production" || input.dbHit) {
    return "not-found";
  }
  return "dev-catalog";
}

/** Live approved projection whenever Supabase is configured. */
export function approvedCatalogSource(input: {
  hasAdminClient: boolean;
  nodeEnv?: string;
  devCatalogFlag?: string;
}): ApprovedCatalogSource {
  if (input.hasAdminClient) {
    return "live-query";
  }
  if (isDevCatalogAllowed(input.nodeEnv, input.devCatalogFlag)) {
    return "dev-catalog";
  }
  return "live-query";
}
