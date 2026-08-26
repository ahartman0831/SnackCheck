import Link from "next/link";
import { listApprovedProducts } from "@/lib/products/repository";

export default async function ApprovedCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const products = await listApprovedProducts({ category });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">
        Products that pass the Arizona Healthy Schools Act ingredient check
      </h1>
      <p className="text-muted">Category: {category}</p>
      {products.length === 0 ? (
        <p className="text-muted">No current passing products in this category.</p>
      ) : (
        <ul className="grid gap-3">
          {products.map((item) => (
            <li key={item.product.id}>
              <Link
                href={`/product/${item.product.slug}`}
                className="font-semibold underline"
              >
                {item.product.brand} {item.product.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
