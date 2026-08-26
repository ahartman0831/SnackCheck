import Link from "next/link";
import { listApprovedProducts } from "@/lib/products/repository";

export default async function ApprovedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; brand?: string }>;
}) {
  const filters = await searchParams;
  const products = await listApprovedProducts(filters);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">
        Products that pass the Arizona Healthy Schools Act ingredient check
      </h1>
      <p className="text-muted">
        Only current, non-conflicted formulations that pass the quality gates appear here.
        This is not an allergy-safe or school-approved list.
      </p>
      {products.length === 0 ? (
        <p className="border-border bg-surface text-muted rounded-2xl border p-5">
          No verified passing products are published yet.
        </p>
      ) : (
        <ul className="grid gap-3">
          {products.map((item) => (
            <li key={item.product.id}>
              <Link
                href={`/product/${item.product.slug}`}
                className="border-border bg-surface block rounded-2xl border p-4"
              >
                <p className="text-muted text-sm">{item.product.brand}</p>
                <p className="text-lg font-semibold">{item.product.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
