import "server-only";
import {
  arizonaRuleset,
  evaluateCompliance,
  hashFormulation,
  parseIngredients,
} from "@snackcheck/compliance";
import { isDevCatalogAllowed } from "./lookup-policy";
import type { ProductPageModel, ProductRecord } from "./types";

/**
 * Clearly labeled non-production fixtures. Loaded only when
 * DEV_CATALOG_ENABLED=true and NODE_ENV !== production.
 */
const DEV_PRODUCTS: ProductPageModel[] = [
  createFixture({
    id: "dev-pass-oat-bars",
    slug: "dev-fixture-plain-oat-bars",
    brand: "[DEV FIXTURE] North Mesa",
    name: "Plain Oat Bars",
    category: "bars",
    gtin14: "00000000000000",
    primaryUpc: "000000000000",
    ingredients: "Whole grain oats, brown sugar, sunflower oil, salt, baking soda",
    verificationStatus: "VERIFIED",
  }),
  createFixture({
    id: "dev-fail-fruit-snacks",
    slug: "dev-fixture-fruit-snacks",
    brand: "[DEV FIXTURE] Red Mesa",
    name: "Fruit Snacks",
    category: "fruit-snacks",
    gtin14: "00000000000017",
    primaryUpc: "000000000001",
    ingredients: "Corn syrup, sugar, fruit puree, Red dye 40, citric acid",
    verificationStatus: "PACKAGE_VERIFIED",
  }),
  createFixture({
    id: "dev-verify-chips",
    slug: "dev-fixture-unconfirmed-chips",
    brand: "[DEV FIXTURE] East Mesa",
    name: "Unconfirmed Chips",
    category: "chips",
    gtin14: "00000000000024",
    primaryUpc: "000000000002",
    ingredients: "Potatoes, oil, salt",
    verificationStatus: "COMMUNITY_SUBMITTED",
  }),
];

function createFixture(input: {
  id: string;
  slug: string;
  brand: string;
  name: string;
  category: string;
  gtin14: string;
  primaryUpc: string;
  ingredients: string;
  verificationStatus: "VERIFIED" | "PACKAGE_VERIFIED" | "COMMUNITY_SUBMITTED";
}): ProductPageModel {
  const parsed = parseIngredients(input.ingredients);
  const hash = hashFormulation({
    rawIngredients: input.ingredients,
    ingredients: parsed.ingredients,
  });
  const formulation = {
    id: `${input.id}-f1`,
    productId: input.id,
    version: 1,
    rawIngredients: input.ingredients,
    normalizedIngredientText: parsed.normalizedText,
    hash,
    verificationStatus: input.verificationStatus,
    confidence: 1,
    lastVerifiedAt: "2026-08-01T00:00:00.000Z",
    firstObservedAt: "2026-08-01T00:00:00.000Z",
    lastObservedAt: "2026-08-01T00:00:00.000Z",
    conflict: false,
    sourceType: "ADMIN_ENTRY",
    sourceTitle: "Local development fixture — not real product data",
    sourceUrl: null,
  };
  const product: ProductRecord = {
    id: input.id,
    slug: input.slug,
    brand: input.brand,
    name: input.name,
    variant: null,
    size: null,
    category: input.category,
    gtin14: input.gtin14,
    primaryUpc: input.primaryUpc,
    imageUrl: null,
    imageAttribution: null,
    individuallyPackaged: true,
    formulationConflict: false,
    labeledDevelopmentFixture: true,
  };
  const base = {
    formulation: {
      id: formulation.id,
      hash,
      rawIngredients: input.ingredients,
      ingredients: parsed.ingredients,
      verificationStatus: input.verificationStatus,
      confidence: 1,
      lastVerifiedAt: formulation.lastVerifiedAt,
      conflict: false,
    },
    ruleset: arizonaRuleset(),
    evaluationDate: "2026-08-26",
  };
  return {
    product,
    formulation,
    classroom: evaluateCompliance({ ...base, context: "CLASSROOM_DISTRIBUTION" }),
    ownChild: evaluateCompliance({ ...base, context: "PARENT_OWN_CHILD" }),
  };
}

export function devCatalogEnabled(): boolean {
  return isDevCatalogAllowed(process.env.NODE_ENV, process.env.DEV_CATALOG_ENABLED);
}

export function listDevProducts(): ProductPageModel[] {
  return devCatalogEnabled() ? DEV_PRODUCTS : [];
}

export function findDevProduct(slug: string): ProductPageModel | null {
  return listDevProducts().find((item) => item.product.slug === slug) ?? null;
}

export function searchDevProducts(query: string): ProductPageModel[] {
  const q = query.toLowerCase();
  return listDevProducts().filter((item) =>
    `${item.product.brand} ${item.product.name} ${item.product.primaryUpc}`
      .toLowerCase()
      .includes(q),
  );
}

export function findDevByGtin(gtin14: string): ProductPageModel | null {
  return listDevProducts().find((item) => item.product.gtin14 === gtin14) ?? null;
}
