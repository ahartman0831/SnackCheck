import Link from "next/link";
import { SearchForm } from "@/components/search/search-form";
import { searchProducts } from "@/lib/products/repository";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query.length >= 2 ? await searchProducts(query) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Search</h1>
      <SearchForm defaultValue={query} autoFocus />
      {query.length > 0 && query.length < 2 ? (
        <p className="text-muted">Type at least two characters.</p>
      ) : null}
      {query.length >= 2 && results.length === 0 ? (
        <div className="border-border bg-surface rounded-2xl border p-5">
          <p className="font-semibold">No products matched that search.</p>
          <p className="text-muted mt-2">
            Try a barcode scan or photograph the ingredient panel. No product record was
            invented.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link className="font-semibold underline" href="/scan/barcode">
              Scan barcode
            </Link>
            <Link className="font-semibold underline" href="/scan/ingredients">
              Scan ingredients
            </Link>
          </div>
        </div>
      ) : null}
      <ul className="grid gap-3">
        {results.map((item) => (
          <li key={item.id}>
            <Link
              href={`/product/${item.slug}`}
              className="border-border bg-surface block rounded-2xl border p-4"
            >
              <p className="text-muted text-sm">{item.brand}</p>
              <p className="text-lg font-semibold">{item.name}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
