import type { Metadata } from "next";
import { ProductSearch } from "@/components/public/product-search";
import { searchProducts } from "@/lib/products/repository";
import { normalizeSearchQuery } from "@/lib/products/search-query";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Search",
  path: "/search",
  description: "Search packaged foods in the SnackCheck catalog.",
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const parsed = normalizeSearchQuery(q);
  const query = "query" in parsed ? parsed.query : q.trim();
  const malformed = "error" in parsed && q.trim().length > 0;
  const results = "query" in parsed ? await searchProducts(parsed.query) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Search</h1>
      {malformed ? (
        <p className="text-muted" role="status">
          {parsed.error === "too_long"
            ? "That search is too long."
            : "Type at least two characters."}
        </p>
      ) : null}
      <ProductSearch initialQuery={query} initialResults={results} autoFocus live />
    </div>
  );
}
