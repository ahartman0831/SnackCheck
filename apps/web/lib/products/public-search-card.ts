import type { FreshnessState, PublicProductCard } from "@snackcheck/contracts";

const FRESHNESS_STATES = new Set<FreshnessState>([
  "CURRENT",
  "AGING",
  "STALE",
  "UNKNOWN",
]);

export interface LiveSearchRow {
  id: string;
  slug: string;
  brand: string;
  name: string;
  variant: string | null;
  size?: string | null;
  category: string | null;
  image_url: string | null;
  image_attribution?: string | null;
  ingredient_status?: "PASS" | "FAIL" | "VERIFY" | null;
  verification_status?: string | null;
  last_verified_at?: string | null;
  freshness_state?: string | null;
  formulation_conflict?: boolean | null;
  ruleset_hash?: string | null;
  individually_packaged?: boolean | null;
  evidence_title?: string | null;
  evidence_url?: string | null;
  evidence_observed_at?: string | null;
  rank?: number | null;
  similarity?: number | null;
}

export type PublicSearchCard = PublicProductCard;

/** Finished public cards always have PASS, FAIL, or VERIFY — never null. */
export function mapLiveSearchCard(row: LiveSearchRow): PublicSearchCard {
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    variant: row.variant,
    size: row.size ?? null,
    category: row.category,
    imageUrl: row.image_url,
    imageAttribution: row.image_attribution ?? null,
    ingredientStatus: row.ingredient_status ?? "VERIFY",
    verificationStatus:
      (row.verification_status as PublicSearchCard["verificationStatus"]) ?? null,
    lastVerifiedAt: row.last_verified_at ?? null,
    freshnessState:
      row.freshness_state && FRESHNESS_STATES.has(row.freshness_state as FreshnessState)
        ? (row.freshness_state as FreshnessState)
        : "UNKNOWN",
    formulationConflict: Boolean(row.formulation_conflict),
    rulesetHash: row.ruleset_hash ?? null,
    individuallyPackaged: row.individually_packaged ?? null,
    evidenceTitle: row.evidence_title ?? null,
    evidenceUrl: row.evidence_url ?? null,
    evidenceObservedAt: row.evidence_observed_at ?? null,
  };
}
