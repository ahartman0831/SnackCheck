import "server-only";
import type { Json } from "@snackcheck/db-types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const REVIEW_ROLES = ["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"] as const;

type CandidateRow = {
  id: string;
  provider: string;
  external_record_id: string;
  source_version: string;
  source_gtin: string;
  normalized_gtin14: string;
  brand: string;
  product_name: string;
  variant: string | null;
  size: string | null;
  category: string | null;
  raw_ingredient_text: string;
  normalized_ingredient_text: string;
  market_country: string;
  source_modified_at: string | null;
  source_published_at: string | null;
  discontinued: boolean;
  source_url: string;
  source_reference: string;
  license_identifier: string;
  attribution: string | null;
  screen_status: string;
  quality_flags: Json;
  matched_rule_ids: Json;
  engine_version: string;
  ruleset_hash: string;
  candidate_state: string;
  catalog_automation_route?: string | null;
  classroom_relevance_policy_version?: string | null;
  classroom_relevance_score?: number | null;
  classroom_relevance_tier?: string | null;
  classroom_relevance_reasons?: Json;
  canonical_product_id: string | null;
  canonical_formulation_id: string | null;
  review_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogCandidateFilters = {
  provider: "ALL" | "USDA_FDC" | "OPEN_FOOD_FACTS";
  route: "ALL" | "AUTO_EVIDENCE" | "HUMAN_EXCEPTION" | "DEPRIORITIZED";
  state: string;
  screen: "ALL" | "PASS" | "FAIL" | "VERIFY";
  query: string;
  order: "oldest" | "newest";
};

export type CatalogCandidateSummary = {
  id: string;
  provider: string;
  brand: string;
  name: string;
  gtin14: string;
  category: string | null;
  screenStatus: string;
  state: string;
  qualityFlags: string[];
  updatedAt: string;
  relevanceScore: number | null;
  relevanceTier: string | null;
  automationRoute: string | null;
};

export type CatalogCandidateDetail = CatalogCandidateSummary & {
  externalRecordId: string;
  sourceVersion: string;
  sourceGtin: string;
  variant: string | null;
  size: string | null;
  rawIngredientText: string;
  normalizedIngredientText: string;
  marketCountry: string;
  sourceModifiedAt: string | null;
  sourcePublishedAt: string | null;
  discontinued: boolean;
  sourceUrl: string | null;
  sourceReference: string;
  licenseIdentifier: string;
  attribution: string | null;
  matchedRuleIds: string[];
  engineVersion: string;
  rulesetHash: string;
  reviewReason: string | null;
  reviewedAt: string | null;
  canonicalProductId: string | null;
  canonicalFormulationId: string | null;
  relevancePolicyVersion: string | null;
  relevanceReasons: string[];
  existingProduct: null | {
    id: string;
    brand: string;
    name: string;
    slug: string;
    active: boolean;
    formulations: Array<{
      id: string;
      version: number;
      status: string;
      active: boolean;
      rawIngredients: string;
      lastVerifiedAt: string | null;
    }>;
  };
  audit: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    requestId: string | null;
    createdAt: string;
  }>;
};

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function strings(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseCatalogCandidateFilters(
  values: Record<string, string | string[] | undefined>,
): CatalogCandidateFilters {
  const provider = single(values.provider);
  const screen = single(values.screen);
  const route = single(values.route);
  const state = single(values.state).slice(0, 40);
  return {
    provider:
      provider === "USDA_FDC" || provider === "OPEN_FOOD_FACTS" ? provider : "ALL",
    route:
      route === "ALL" || route === "HUMAN_EXCEPTION" || route === "DEPRIORITIZED"
        ? route
        : "AUTO_EVIDENCE",
    state: state || "REVIEW_QUEUED",
    screen:
      screen === "PASS" || screen === "FAIL" || screen === "VERIFY" ? screen : "ALL",
    query: single(values.query).trim().slice(0, 100),
    order: single(values.order) === "newest" ? "newest" : "oldest",
  };
}

export async function listCatalogCandidates(
  filters: CatalogCandidateFilters,
): Promise<CatalogCandidateSummary[] | null> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  let query = admin.from("catalog_source_records").select("*");
  if (filters.provider !== "ALL") query = query.eq("provider", filters.provider);
  if (filters.route !== "ALL")
    query = query.eq("catalog_automation_route", filters.route);
  if (filters.state !== "ALL") query = query.eq("candidate_state", filters.state);
  if (filters.screen !== "ALL") query = query.eq("screen_status", filters.screen);
  if (filters.query) {
    const cleaned = filters.query.replaceAll(/[,%()]/g, " ");
    query = query.or(
      `brand.ilike.%${cleaned}%,product_name.ilike.%${cleaned}%,normalized_gtin14.ilike.%${cleaned}%`,
    );
  }
  const result = await query
    .order("updated_at", { ascending: filters.order === "oldest" })
    .limit(50);
  if (result.error) throw new Error("The catalog candidate queue could not be loaded.");
  return ((result.data ?? []) as unknown as CandidateRow[]).map((row) => ({
    id: row.id,
    provider: row.provider,
    brand: row.brand,
    name: row.product_name,
    gtin14: row.normalized_gtin14,
    category: row.category,
    screenStatus: row.screen_status,
    state: row.candidate_state,
    qualityFlags: strings(row.quality_flags),
    updatedAt: row.updated_at,
    relevanceScore: row.classroom_relevance_score ?? null,
    relevanceTier: row.classroom_relevance_tier ?? null,
    automationRoute: row.catalog_automation_route ?? null,
  }));
}

export async function getCatalogCandidate(
  id: string,
): Promise<
  | { kind: "unauthorized" }
  | { kind: "not-found" }
  | { kind: "ready"; record: CatalogCandidateDetail }
> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed) return { kind: "unauthorized" };
  const admin = createAdminClient();
  if (!admin) return { kind: "unauthorized" };
  const candidateResult = await admin
    .from("catalog_source_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (candidateResult.error)
    throw new Error("The catalog candidate could not be loaded.");
  if (!candidateResult.data) return { kind: "not-found" };
  const row = candidateResult.data as unknown as CandidateRow;
  const [productResult, auditResult] = await Promise.all([
    admin
      .from("products")
      .select("id,brand,name,slug,active")
      .eq("gtin14", row.normalized_gtin14)
      .maybeSingle(),
    admin
      .from("admin_audit_log")
      .select("id,action,actor_user_id,request_id,created_at")
      .eq("entity_type", "catalog_candidate")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (productResult.error || auditResult.error)
    throw new Error("Some catalog candidate evidence could not be loaded.");
  const formulations = productResult.data
    ? await admin
        .from("formulations")
        .select("id,version,verification_status,active,raw_ingredients,last_verified_at")
        .eq("product_id", productResult.data.id)
        .order("version", { ascending: false })
    : { data: [], error: null };
  if (formulations.error)
    throw new Error("Existing product evidence could not be loaded.");
  return {
    kind: "ready",
    record: {
      id: row.id,
      provider: row.provider,
      brand: row.brand,
      name: row.product_name,
      gtin14: row.normalized_gtin14,
      category: row.category,
      screenStatus: row.screen_status,
      state: row.candidate_state,
      qualityFlags: strings(row.quality_flags),
      updatedAt: row.updated_at,
      externalRecordId: row.external_record_id,
      sourceVersion: row.source_version,
      sourceGtin: row.source_gtin,
      variant: row.variant,
      size: row.size,
      rawIngredientText: row.raw_ingredient_text,
      normalizedIngredientText: row.normalized_ingredient_text,
      marketCountry: row.market_country,
      sourceModifiedAt: row.source_modified_at,
      sourcePublishedAt: row.source_published_at,
      discontinued: row.discontinued,
      sourceUrl: safeSourceUrl(row.source_url),
      sourceReference: row.source_reference,
      licenseIdentifier: row.license_identifier,
      attribution: row.attribution,
      matchedRuleIds: strings(row.matched_rule_ids),
      engineVersion: row.engine_version,
      rulesetHash: row.ruleset_hash,
      reviewReason: row.review_reason ?? null,
      reviewedAt: row.reviewed_at ?? null,
      canonicalProductId: row.canonical_product_id,
      canonicalFormulationId: row.canonical_formulation_id,
      relevanceScore: row.classroom_relevance_score ?? null,
      relevanceTier: row.classroom_relevance_tier ?? null,
      automationRoute: row.catalog_automation_route ?? null,
      relevancePolicyVersion: row.classroom_relevance_policy_version ?? null,
      relevanceReasons: strings(row.classroom_relevance_reasons ?? []),
      existingProduct: productResult.data
        ? {
            ...productResult.data,
            formulations: (formulations.data ?? []).map((item) => ({
              id: item.id,
              version: item.version,
              status: item.verification_status,
              active: item.active,
              rawIngredients: item.raw_ingredients,
              lastVerifiedAt: item.last_verified_at,
            })),
          }
        : null,
      audit: (auditResult.data ?? []).map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorUserId: entry.actor_user_id,
        requestId: entry.request_id,
        createdAt: entry.created_at,
      })),
    },
  };
}
