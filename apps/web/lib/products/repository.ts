import "server-only";
import {
  evaluateCompliance,
  hashFormulation,
  parseIngredients,
} from "@snackcheck/compliance";
import type { PublicProductCard } from "@snackcheck/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isUsablePublishedRuleset,
  loadPublishedArizonaRuleset,
} from "@/lib/rules/arizona";
import {
  findDevByGtin,
  findDevProduct,
  listDevProducts,
  searchDevProducts,
} from "./dev-catalog";
import { freshnessState, isApprovedEligible } from "./approved-eligibility";
import {
  approvedCatalogSource,
  isDevCatalogAllowed,
  productMissFallback,
} from "./lookup-policy";
import { mapLiveSearchCard } from "./public-search-card";
import { clampSearchLimit } from "./search-query";
import type { FormulationRecord, ProductPageModel, ProductRecord } from "./types";

function nodeEnv(): string {
  return process.env.NODE_ENV ?? "development";
}

function devCatalogOn(): boolean {
  return isDevCatalogAllowed(nodeEnv(), process.env.DEV_CATALOG_ENABLED);
}

function resolveMiss(hasAdminClient: boolean, dbHit: boolean) {
  const decision = productMissFallback({
    nodeEnv: nodeEnv(),
    hasAdminClient,
    dbHit,
  });
  return decision === "dev-catalog" && devCatalogOn() ? "dev-catalog" : "not-found";
}

function cardFromDev(item: ProductPageModel): PublicProductCard {
  const lastVerifiedAt = item.formulation?.lastVerifiedAt ?? null;
  return {
    id: item.product.id,
    slug: item.product.slug,
    brand: item.product.brand,
    name: item.product.name,
    variant: item.product.variant,
    size: item.product.size,
    category: item.product.category,
    imageUrl: item.product.imageUrl,
    imageAttribution: item.product.imageAttribution,
    ingredientStatus: item.classroom.ingredientStatus,
    verificationStatus: item.formulation?.verificationStatus ?? null,
    lastVerifiedAt,
    freshnessState: freshnessState({
      lastVerifiedAt,
      evaluationDate: new Date().toISOString().slice(0, 10),
      freshnessCurrentDays: 180,
      freshnessAgingDays: 365,
    }),
    formulationConflict: item.product.formulationConflict,
    rulesetHash: item.classroom.rulesetHash || null,
  };
}

function mapProduct(row: {
  id: string;
  slug: string;
  brand: string;
  name: string;
  variant: string | null;
  size: string | null;
  category: string | null;
  gtin14: string | null;
  primary_upc: string | null;
  image_url: string | null;
  image_attribution: string | null;
  individually_packaged: boolean | null;
  formulation_conflict: boolean;
}): ProductRecord {
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    variant: row.variant,
    size: row.size,
    category: row.category,
    gtin14: row.gtin14,
    primaryUpc: row.primary_upc,
    imageUrl: row.image_url,
    imageAttribution: row.image_attribution,
    individuallyPackaged: row.individually_packaged,
    formulationConflict: row.formulation_conflict,
    labeledDevelopmentFixture: false,
  };
}

export async function getProductBySlug(slug: string): Promise<ProductPageModel | null> {
  const admin = createAdminClient();
  if (!admin) {
    return resolveMiss(false, false) === "dev-catalog" ? findDevProduct(slug) : null;
  }

  const { data: product } = await admin
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!product) {
    return resolveMiss(true, false) === "dev-catalog" ? findDevProduct(slug) : null;
  }

  const { data: formulation } = await admin
    .from("formulations")
    .select("*")
    .eq("product_id", product.id)
    .eq("active", true)
    .order("last_verified_at", { ascending: false, nullsFirst: false })
    .order("last_observed_at", { ascending: false })
    .order("version", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  return hydrate(mapProduct(product), formulation);
}

export async function searchProducts(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    cursorId?: string;
    cursorRank?: number;
    cursorName?: string;
  },
): Promise<PublicProductCard[]> {
  const admin = createAdminClient();
  if (!admin) {
    return resolveMiss(false, false) === "dev-catalog"
      ? searchDevProducts(query).map(cardFromDev)
      : [];
  }

  const { data, error } = await admin.rpc("search_public_products", {
    query,
    result_limit: clampSearchLimit(options?.limit),
    result_offset: Math.max(options?.offset ?? 0, 0),
    cursor_rank: options?.cursorRank ?? null,
    cursor_name: options?.cursorName ?? null,
    cursor_id: options?.cursorId ?? null,
  });
  if (error) {
    return [];
  }
  return (data ?? []).map((row) => mapLiveSearchCard(row));
}

export async function getProductByGtin(gtin14: string): Promise<ProductPageModel | null> {
  const admin = createAdminClient();
  if (!admin) {
    return resolveMiss(false, false) === "dev-catalog" ? findDevByGtin(gtin14) : null;
  }
  const { data: identifier } = await admin
    .from("product_identifiers")
    .select("product_id")
    .eq("normalized_gtin14", gtin14)
    .maybeSingle();
  if (!identifier) {
    return resolveMiss(true, false) === "dev-catalog" ? findDevByGtin(gtin14) : null;
  }
  const { data: product } = await admin
    .from("products")
    .select("*")
    .eq("id", identifier.product_id)
    .maybeSingle();
  if (!product) {
    return null;
  }
  const { data: formulation } = await admin
    .from("formulations")
    .select("*")
    .eq("product_id", product.id)
    .eq("active", true)
    .order("last_verified_at", { ascending: false, nullsFirst: false })
    .order("last_observed_at", { ascending: false })
    .order("version", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return hydrate(mapProduct(product), formulation);
}

export async function listApprovedProducts(filters?: {
  category?: string;
  brand?: string;
  offset?: number;
}): Promise<PublicProductCard[]> {
  const source = approvedCatalogSource({
    hasAdminClient: Boolean(createAdminClient()),
    nodeEnv: nodeEnv(),
    devCatalogFlag: process.env.DEV_CATALOG_ENABLED,
  });
  if (source === "dev-catalog") {
    const ruleset = await loadPublishedArizonaRuleset();
    const currentHash = isUsablePublishedRuleset(ruleset) ? ruleset.rulesetHash : null;
    return listDevProducts()
      .map(cardFromDev)
      .filter((card) =>
        isApprovedEligible({
          ingredientStatus: card.ingredientStatus,
          verificationStatus: card.verificationStatus,
          freshnessState: card.freshnessState,
          formulationConflict: card.formulationConflict,
          rulesetHash: card.rulesetHash,
          currentPublishedRulesetHash: currentHash,
        }),
      )
      .filter((card) => {
        if (filters?.category && card.category !== filters.category) return false;
        if (filters?.brand && card.brand !== filters.brand) return false;
        return true;
      });
  }

  const admin = createAdminClient();
  if (!admin) {
    return [];
  }
  const { data, error } = await admin.rpc("list_approved_public_products", {
    filter_category: filters?.category ?? null,
    filter_brand: filters?.brand ?? null,
    result_limit: 100,
    result_offset: Math.max(filters?.offset ?? 0, 0),
  });
  if (error) {
    return [];
  }
  return (data ?? []).map((row) => mapLiveSearchCard(row));
}

export async function listPublicSitemapEntries(): Promise<
  Array<{ kind: string; path: string }>
> {
  const admin = createAdminClient();
  if (!admin) {
    return [];
  }
  const { data, error } = await admin.rpc("list_public_sitemap_entries");
  if (error || !data) {
    return [];
  }
  return data;
}

async function hydrate(
  product: ProductRecord,
  formulationRow: {
    id: string;
    product_id: string;
    version: number;
    raw_ingredients: string;
    normalized_ingredient_text: string;
    ingredient_text_sha256: string;
    verification_status: FormulationRecord["verificationStatus"];
    confidence: number | null;
    last_verified_at: string | null;
    first_observed_at: string;
    last_observed_at?: string | null;
  } | null,
): Promise<ProductPageModel> {
  const ruleset = await loadPublishedArizonaRuleset();
  if (!formulationRow) {
    const empty = {
      id: "missing",
      hash: "missing",
      rawIngredients: "",
      ingredients: [],
      verificationStatus: "STALE" as const,
      confidence: null,
      lastVerifiedAt: null,
      conflict: product.formulationConflict,
    };
    const classroom = evaluateCompliance({
      formulation: empty,
      ruleset,
      context: "CLASSROOM_DISTRIBUTION",
      evaluationDate: new Date().toISOString().slice(0, 10),
      parserWarnings: [],
    });
    const ownChild = evaluateCompliance({
      formulation: empty,
      ruleset,
      context: "PARENT_OWN_CHILD",
      evaluationDate: new Date().toISOString().slice(0, 10),
      parserWarnings: [],
    });
    return { product, formulation: null, classroom, ownChild };
  }

  const parsed = parseIngredients(formulationRow.raw_ingredients);
  const hash = hashFormulation({
    rawIngredients: formulationRow.raw_ingredients,
    ingredients: parsed.ingredients,
  });
  const formulation: FormulationRecord = {
    id: formulationRow.id,
    productId: formulationRow.product_id,
    version: formulationRow.version,
    rawIngredients: formulationRow.raw_ingredients,
    normalizedIngredientText: formulationRow.normalized_ingredient_text,
    hash,
    verificationStatus: formulationRow.verification_status,
    confidence:
      formulationRow.confidence === null ? null : Number(formulationRow.confidence),
    lastVerifiedAt: formulationRow.last_verified_at,
    firstObservedAt: formulationRow.first_observed_at,
    lastObservedAt: formulationRow.last_observed_at ?? null,
    conflict: product.formulationConflict,
    sourceType: "ADMIN_ENTRY",
    sourceTitle: null,
    sourceUrl: null,
  };
  const input = {
    formulation: {
      id: formulation.id,
      hash,
      rawIngredients: formulation.rawIngredients,
      ingredients: parsed.ingredients,
      verificationStatus: formulation.verificationStatus,
      confidence: formulation.confidence,
      lastVerifiedAt: formulation.lastVerifiedAt,
      conflict: formulation.conflict,
    },
    ruleset,
    evaluationDate: new Date().toISOString().slice(0, 10),
    parserWarnings: parsed.warnings,
  };
  return {
    product,
    formulation,
    classroom: evaluateCompliance({ ...input, context: "CLASSROOM_DISTRIBUTION" }),
    ownChild: evaluateCompliance({ ...input, context: "PARENT_OWN_CHILD" }),
  };
}
