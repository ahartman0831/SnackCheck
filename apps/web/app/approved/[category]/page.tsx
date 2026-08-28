import type { Metadata } from "next";
import Link from "next/link";
import { ProductResultCard } from "@/components/public/product-result-card";
import { PageState } from "@/components/public/page-states";
import { listApprovedProducts } from "@/lib/products/repository";
import { APPROVED_HEADING } from "@/lib/public-copy";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return pageMetadata({
    title: `${APPROVED_HEADING} · ${category}`,
    path: `/approved/${category}`,
  });
}

export default async function ApprovedCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const products = await listApprovedProducts({ category });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">{APPROVED_HEADING}</h1>
      <p className="text-muted">Category: {category}</p>
      <Link
        href="/approved"
        className="text-accent font-semibold underline underline-offset-4"
      >
        All passing products
      </Link>
      {products.length === 0 ? (
        <PageState
          title="No current passing products in this category"
          description="Nothing was invented for an empty category."
          action={
            <Link href="/approved" className="font-semibold underline underline-offset-4">
              Browse all passing products
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {products.map((item) => (
            <li key={item.id}>
              <ProductResultCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
