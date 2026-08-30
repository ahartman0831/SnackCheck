import Link from "next/link";
import { listAdminProducts, parseProductListFilters } from "@/lib/admin/products";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseProductListFilters(await searchParams);
  const products = await listAdminProducts(filters);
  if (!products)
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No product data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Products</h1>
      <p className="text-muted mt-3">
        Search catalog records, inspect evidence, and merge confirmed duplicates. New
        products are created only from approved package submissions.
      </p>
      <form className="border-border mt-6 grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_auto_auto]">
        <label className="text-sm font-semibold">
          Product, barcode, slug, or reference
          <input
            name="query"
            defaultValue={filters.query}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          State
          <select
            name="state"
            defaultValue={filters.state}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          >
            <option value="active">Active</option>
            <option value="inactive">Merged/inactive</option>
            <option value="all">All</option>
          </select>
        </label>
        <div className="flex items-end gap-3">
          <button className="bg-accent text-on-accent rounded-xl px-4 py-2 font-semibold">
            Apply
          </button>
          <Link href="/admin/products" className="px-2 py-2 underline">
            Clear
          </Link>
        </div>
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="border-border rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  {product.brand} {product.name}
                </h2>
                <p className="text-muted text-sm">
                  {product.variant ?? "No variant"} ·{" "}
                  {product.active ? "ACTIVE" : "INACTIVE"}
                </p>
              </div>
              <code className="text-muted text-xs">{product.id.slice(0, 8)}</code>
            </div>
            <dl className="text-muted mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt>GTIN</dt>
              <dd>{product.gtin14 ?? "None"}</dd>
              <dt>Identifiers</dt>
              <dd>{product.identifierCount}</dd>
              <dt>Formulations</dt>
              <dd>{product.formulationCount}</dd>
              <dt>Conflict</dt>
              <dd>{product.conflict ? "Open" : "None"}</dd>
            </dl>
            <Link
              href={`/admin/products/${product.id}`}
              className="mt-4 inline-block font-semibold underline"
            >
              Inspect product
            </Link>
          </article>
        ))}
      </div>
      {products.length === 0 ? (
        <p className="text-muted mt-6">No products match these filters.</p>
      ) : null}
    </div>
  );
}
