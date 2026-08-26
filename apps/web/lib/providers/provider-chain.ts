import { getProductByGtin } from "@/lib/products/repository";
import { OpenFoodFactsProvider } from "./open-food-facts-provider";
import type { ProviderProductResult } from "./product-data-provider";

const off = new OpenFoodFactsProvider();
const cache = new Map<string, { expires: number; value: ProviderProductResult }>();

export async function lookupGtin(gtin14: string): Promise<{
  source: "internal" | "cache" | "open_food_facts" | "none";
  result: ProviderProductResult | { kind: "INTERNAL"; slug: string };
}> {
  const internal = await getProductByGtin(gtin14);
  if (internal) {
    return {
      source: "internal",
      result: { kind: "INTERNAL", slug: internal.product.slug },
    };
  }
  const cached = cache.get(gtin14);
  if (cached && cached.expires > Date.now()) {
    return { source: "cache", result: cached.value };
  }
  const external = await off.getByGtin(gtin14);
  cache.set(gtin14, { expires: Date.now() + 12 * 60 * 60 * 1000, value: external });
  return { source: "open_food_facts", result: external };
}
