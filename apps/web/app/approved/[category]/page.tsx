import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { categoryLabel, discoveryHref } from "@/lib/products/discovery";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return pageMetadata({
    title: `What can I bring? · ${categoryLabel(category)}`,
    path: `/approved/${category}`,
  });
}

export default async function ApprovedCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  redirect(discoveryHref({ category }));
}
