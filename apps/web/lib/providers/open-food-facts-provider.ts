import { z } from "zod";
import { env } from "@/lib/env";
import type { ProductDataProvider, ProviderProductResult } from "./product-data-provider";

const OffProductSchema = z.object({
  status: z.number().optional(),
  product: z
    .object({
      product_name: z.string().optional(),
      brands: z.string().optional(),
      ingredients_text: z.string().optional(),
      image_url: z.string().optional(),
    })
    .optional(),
});

export class OpenFoodFactsProvider implements ProductDataProvider {
  readonly name = "open_food_facts";

  async getByGtin(gtin14: string): Promise<ProviderProductResult> {
    const provenance = {
      provider: this.name,
      fetchedAt: new Date().toISOString(),
      attribution: "Open Food Facts, community database — not guaranteed accurate",
    };
    if (!env.OPEN_FOOD_FACTS_ENABLED) {
      return { kind: "UNAVAILABLE", provenance };
    }
    try {
      const code = gtin14.replace(/^0+/, "") || gtin14;
      const url = `${env.OPEN_FOOD_FACTS_BASE_URL}/api/v3/product/${code}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": env.OPEN_FOOD_FACTS_USER_AGENT,
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        return { kind: "UNAVAILABLE", provenance };
      }
      const parsed = OffProductSchema.safeParse(await response.json());
      if (!parsed.success || !parsed.data.product?.product_name) {
        return { kind: "NOT_FOUND", provenance };
      }
      return {
        kind: "FOUND",
        provenance,
        product: {
          gtin14,
          brand: parsed.data.product.brands ?? "Unknown brand",
          name: parsed.data.product.product_name,
          ingredients: parsed.data.product.ingredients_text ?? null,
          imageUrl: parsed.data.product.image_url ?? null,
          imageAttribution: "Open Food Facts contributors",
        },
      };
    } catch {
      return { kind: "UNAVAILABLE", provenance };
    }
  }
}
