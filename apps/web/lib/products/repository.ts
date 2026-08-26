import "server-only";
import {
  evaluateCompliance,
  hashFormulation,
  parseIngredients,
} from "@snackcheck/compliance";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPublishedArizonaRuleset } from "@/lib/rules/arizona";
import {
  findDevByGtin,
  findDevProduct,
  listDevProducts,
  searchDevProducts,
} from "./dev-catalog";
import type { FormulationRecord, ProductPageModel, ProductRecord } from "./types";

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
    return findDevProduct(slug);
  }

  const { data: product } = await admin
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!product) {
    return findDevProduct(slug);
  }

  const { data: formulation } = await admin
    .from("formulations")
    .select("*")
    .eq("product_id", product.id)
    .eq("active", true)
    .order("last_verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return hydrate(mapProduct(product), formulation);
}

export async function searchProducts(query: string) {
  const admin = createAdminClient();
  if (!admin) {
    return searchDevProducts(query).map((item) => ({
      id: item.product.id,
      slug: item.product.slug,
      brand: item.product.brand,
      name: item.product.name,
      variant: item.product.variant,
      category: item.product.category,
      imageUrl: item.product.imageUrl,
      ingredientStatus: item.classroom.ingredientStatus,
      verificationStatus: item.formulation?.verificationStatus ?? null,
      lastVerifiedAt: item.formulation?.lastVerifiedAt ?? null,
    }));
  }

  const { data } = await admin.rpc("search_products", {
    query,
    result_limit: 24,
    result_offset: 0,
  });

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    variant: row.variant,
    category: row.category,
    imageUrl: row.image_url,
    ingredientStatus: null as null,
    verificationStatus: null,
    lastVerifiedAt: null,
  }));
}

export async function getProductByGtin(gtin14: string): Promise<ProductPageModel | null> {
  const admin = createAdminClient();
  if (!admin) {
    return findDevByGtin(gtin14);
  }
  const { data: identifier } = await admin
    .from("product_identifiers")
    .select("product_id")
    .eq("normalized_gtin14", gtin14)
    .maybeSingle();
  if (!identifier) {
    return findDevByGtin(gtin14);
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
    .limit(1)
    .maybeSingle();
  return hydrate(mapProduct(product), formulation);
}

export async function listApprovedProducts(filters?: {
  category?: string;
  brand?: string;
}) {
  const models = createAdminClient()
    ? []
    : listDevProducts().filter(
        (item) =>
          item.classroom.ingredientStatus === "PASS" &&
          !item.product.formulationConflict &&
          item.formulation?.verificationStatus !== "STALE" &&
          item.formulation?.verificationStatus !== "CONFLICT",
      );

  return models.filter((item) => {
    if (filters?.category && item.product.category !== filters.category) return false;
    if (filters?.brand && item.product.brand !== filters.brand) return false;
    return true;
  });
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
    });
    const ownChild = evaluateCompliance({
      formulation: empty,
      ruleset,
      context: "PARENT_OWN_CHILD",
      evaluationDate: new Date().toISOString().slice(0, 10),
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
  };
  return {
    product,
    formulation,
    classroom: evaluateCompliance({ ...input, context: "CLASSROOM_DISTRIBUTION" }),
    ownChild: evaluateCompliance({ ...input, context: "PARENT_OWN_CHILD" }),
  };
}
