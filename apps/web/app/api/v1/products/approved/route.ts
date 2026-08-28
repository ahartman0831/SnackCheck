import { NextResponse } from "next/server";
import { ok, requestId } from "@/lib/api/envelope";
import { listApprovedProducts } from "@/lib/products/repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const products = await listApprovedProducts({
    category: url.searchParams.get("category") ?? undefined,
    brand: url.searchParams.get("brand") ?? undefined,
  });
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
      })),
      requestId(),
    ),
  );
}
