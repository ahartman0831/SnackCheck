import type { Metadata } from "next";
import Link from "next/link";
import { ApprovedFilters } from "@/components/public/approved-filters";
import { ProductResultCard } from "@/components/public/product-result-card";
import { PageState, UnavailableRulesetState } from "@/components/public/page-states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  categoryLabel,
  discoveryHref,
  filterDiscoveryProducts,
  parseDiscoveryFilters,
} from "@/lib/products/discovery";
import { listApprovedDiscoveryProducts } from "@/lib/products/repository";
import {
  isUsablePublishedRuleset,
  loadPublishedArizonaRuleset,
} from "@/lib/rules/arizona";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "What can I bring?",
  path: "/approved",
  description:
    "Browse current products that pass the Arizona 11-ingredient screen. This is not an allergy or school-policy list.",
});

const PAGE_SIZE = 24;

export default async function ApprovedPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    verification?: string;
    packaged?: string;
    offset?: string;
  }>;
}) {
  const query = await searchParams;
  const filters = parseDiscoveryFilters(query);
  const offset = Math.max(Number(query.offset ?? 0) || 0, 0);
  const ruleset = await loadPublishedArizonaRuleset();
  const products = await listApprovedDiscoveryProducts({ limit: 500 });
  const filtered = filterDiscoveryProducts(products, filters);
  const visible = filtered.slice(offset, offset + PAGE_SIZE);
  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right));
  const brands = [...new Set(products.map((item) => item.brand))].sort((left, right) =>
    left.localeCompare(right),
  );
  const hasFilters = Boolean(
    filters.category ||
    filters.brand ||
    filters.verification ||
    filters.individuallyPackaged,
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="brand-grid bg-surface rounded-[20px] px-5 py-7 shadow-[var(--shadow)] sm:px-8">
        <p className="text-accent text-sm font-semibold uppercase tracking-[0.16em]">
          Current, reviewed package evidence
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">What can I bring?</h1>
        <p className="text-muted mt-3 max-w-3xl text-lg">
          Browse products that pass the current Arizona 11-ingredient screen. Always
          compare the package in your hand: recipes and school policies can change.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/search">Search by product or brand</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/scan/barcode">Check a barcode</Link>
          </Button>
        </div>
      </header>

      {!isUsablePublishedRuleset(ruleset) ? (
        <UnavailableRulesetState />
      ) : products.length === 0 ? (
        <PageState
          title="No current passing products yet"
          description="The rules are available, but no reviewed product currently satisfies every public catalog gate. Nothing has been invented to fill the list."
          action={
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/search">Search products</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/scan/ingredients?request=product">Request a product</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <section aria-labelledby="browse-category-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="browse-category-heading" className="text-2xl font-semibold">
                  Browse by category
                </h2>
                <p className="text-muted mt-1">
                  Categories appear only when at least one current passing product exists.
                </p>
              </div>
              {hasFilters ? (
                <Button asChild variant="ghost">
                  <Link href="/approved">See every category</Link>
                </Button>
              ) : null}
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const count = products.filter(
                  (product) => product.category === category,
                ).length;
                return (
                  <li key={category}>
                    <Link href={discoveryHref({ category })}>
                      <Card className="h-full transition-colors hover:bg-[var(--surface-strong)]">
                        <h3 className="text-lg font-semibold">
                          {categoryLabel(category)}
                        </h3>
                        <p className="text-muted mt-1 text-sm">
                          {count} current product{count === 1 ? "" : "s"}
                        </p>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            aria-labelledby="passing-products-heading"
            className="flex flex-col gap-4"
          >
            <div>
              <h2 id="passing-products-heading" className="text-2xl font-semibold">
                {filters.category
                  ? `${categoryLabel(filters.category)} that pass`
                  : "Current products that pass"}
              </h2>
              <p className="text-muted mt-1 text-sm">
                {filtered.length} product{filtered.length === 1 ? "" : "s"} · neutral
                ordering by category, brand, and name · never by affiliate payment
              </p>
            </div>
            <ApprovedFilters
              categories={categories}
              brands={brands}
              values={{
                category: filters.category,
                brand: filters.brand,
                verification: filters.verification,
                packaged: filters.individuallyPackaged ? "yes" : undefined,
              }}
            />
            {visible.length === 0 ? (
              <PageState
                title="No products match those filters"
                description="Clear the filters to see every current passing product."
                action={
                  <Button asChild variant="ghost">
                    <Link href="/approved">Clear all</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-3 lg:grid-cols-2">
                {visible.map((item) => (
                  <li key={item.id}>
                    <ProductResultCard item={item} />
                  </li>
                ))}
              </ul>
            )}
            <nav aria-label="Catalog pages" className="flex gap-3">
              {offset > 0 ? (
                <Button asChild variant="secondary">
                  <Link
                    href={discoveryHref({
                      ...query,
                      offset: Math.max(offset - PAGE_SIZE, 0),
                    })}
                  >
                    Previous
                  </Link>
                </Button>
              ) : null}
              {offset + PAGE_SIZE < filtered.length ? (
                <Button asChild variant="secondary">
                  <Link href={discoveryHref({ ...query, offset: offset + PAGE_SIZE })}>
                    Next
                  </Link>
                </Button>
              ) : null}
            </nav>
          </section>

          <aside className="bg-surface-strong rounded-[20px] p-5">
            <h2 className="text-lg font-semibold">Package changed or product missing?</h2>
            <p className="text-muted mt-1">
              Check the current ingredient panel. A report never keeps an old passing
              result current automatically.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/scan/ingredients?request=package-change">
                  Report a package change
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/scan/ingredients?request=product">Request a product</Link>
              </Button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
