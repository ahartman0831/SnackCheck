import { NextResponse } from "next/server";
import { ok, requestId } from "@/lib/api/envelope";
import { parseDiscoveryFilters } from "@/lib/products/discovery";
import { listApprovedDiscoveryProducts } from "@/lib/products/repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseDiscoveryFilters({
    category: url.searchParams.get("category") ?? undefined,
    brand: url.searchParams.get("brand") ?? undefined,
    verification: url.searchParams.get("verification") ?? undefined,
    packaged: url.searchParams.get("packaged") ?? undefined,
  });
  const products = await listApprovedDiscoveryProducts(filters);
  return NextResponse.json(
    ok(
      products.map((item) => ({
        slug: item.slug,
        brand: item.brand,
        name: item.name,
        category: item.category,
        ingredientStatus: item.ingredientStatus,
        verificationStatus: item.verificationStatus,
        lastVerifiedAt: item.lastVerifiedAt,
        freshnessState: item.freshnessState,
        imageUrl: item.imageUrl,
        imageAttribution: item.imageAttribution,
        formulationConflict: item.formulationConflict,
        rulesetHash: item.rulesetHash,
        individuallyPackaged: item.individuallyPackaged ?? null,
        evidenceTitle: item.evidenceTitle ?? null,
        evidenceUrl: item.evidenceUrl ?? null,
        evidenceObservedAt: item.evidenceObservedAt ?? null,
      })),
      requestId(),
    ),
  );
}
