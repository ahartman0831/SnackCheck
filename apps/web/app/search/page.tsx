import type { Metadata } from "next";
import { Search } from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7">
      <header className="glass-panel rounded-[28px] px-5 py-7 sm:px-8">
        <span className="bg-accent-soft text-accent flex size-12 items-center justify-center rounded-[18px]">
          <Search className="size-6" aria-hidden />
        </span>
        <p className="eyebrow mt-5">Product finder</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Find a snack
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-lg">
          Search a product or brand, then open the result to see the current evidence
          behind it.
        </p>
      </header>
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
