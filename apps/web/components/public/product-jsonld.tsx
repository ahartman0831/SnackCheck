import type { ProductPageModel } from "@/lib/products/types";
import { publicAppUrl } from "@/lib/brand";

export function ProductJsonLd({ model }: { model: ProductPageModel }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: model.product.name,
    brand: { "@type": "Brand", name: model.product.brand },
    description: `${model.classroom.ingredientStatus}: ${model.classroom.explanation.summary}`,
    url: `${publicAppUrl()}/product/${model.product.slug}`,
    ...(model.product.imageUrl ? { image: model.product.imageUrl } : {}),
    ...(model.product.gtin14 ? { gtin14: model.product.gtin14 } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
