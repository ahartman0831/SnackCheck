import type { Metadata } from "next";
import Link from "next/link";
import { ApprovedFilters } from "@/components/public/approved-filters";
import { ProductResultCard } from "@/components/public/product-result-card";
import { PageState, UnavailableRulesetState } from "@/components/public/page-states";
import { Button } from "@/components/ui/button";
import { listApprovedProducts } from "@/lib/products/repository";
import { APPROVED_HEADING } from "@/lib/public-copy";
import {
  isUsablePublishedRuleset,
  loadPublishedArizonaRuleset,
} from "@/lib/rules/arizona";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: APPROVED_HEADING,
  path: "/approved",
  description:
    "Current products that pass the Arizona ingredient check. This is not an allergy or school-policy list.",
});

export default async function ApprovedPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    freshness?: string;
    verification?: string;
    offset?: string;
  }>;
}) {
  const filters = await searchParams;
  const offset = Math.max(Number(filters.offset ?? 0) || 0, 0);
  const ruleset = await loadPublishedArizonaRuleset();
  const products = await listApprovedProducts({
    category: filters.category,
    brand: filters.brand,
    offset,
  });
  const filtered = products.filter((item) => {
    if (filters.freshness && item.freshnessState !== filters.freshness) return false;
    if (filters.verification && item.verificationStatus !== filters.verification) {
      return false;
    }
    return true;
  });
  const categories = [
    ...new Set(products.map((item) => item.category).filter(Boolean)),
  ] as string[];
  const brands = [...new Set(products.map((item) => item.brand))];
  const active = [
    filters.category,
    filters.brand,
    filters.freshness,
    filters.verification,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">{APPROVED_HEADING}</h1>
      <p className="text-muted">
        Only current, non-conflicted formulations that pass the quality gates appear here.
        This is not an allergy list, a school-policy approval, or a state endorsement.
        Individually packaged is not a public filter yet because the approved projection
        does not expose that field.
      </p>
      {!isUsablePublishedRuleset(ruleset) ? (
        <UnavailableRulesetState />
      ) : products.length === 0 ? (
        <PageState
          title="No current passing products"
          description="The published ruleset is available, but no formulation currently meets the approved projection gates."
          action={
            <Button asChild variant="secondary">
              <Link href="/search">Search products</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ApprovedFilters
            categories={categories}
            brands={brands}
            values={{
              category: filters.category,
              brand: filters.brand,
              freshness: filters.freshness,
              verification: filters.verification,
            }}
          />
          <p className="text-muted text-sm">
            {filtered.length} product{filtered.length === 1 ? "" : "s"}
            {active.length > 0 ? ` · filters: ${active.join(", ")}` : ""}
          </p>
          {filtered.length === 0 ? (
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
            <ul className="grid gap-3">
              {filtered.map((item) => (
                <li key={item.id}>
                  <ProductResultCard item={item} />
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-3">
            {offset > 0 ? (
              <Button asChild variant="secondary">
                <Link href={`/approved?offset=${Math.max(offset - 100, 0)}`}>
                  Previous
                </Link>
              </Button>
            ) : null}
            {products.length === 100 ? (
              <Button asChild variant="secondary">
                <Link href={`/approved?offset=${offset + 100}`}>Next</Link>
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
