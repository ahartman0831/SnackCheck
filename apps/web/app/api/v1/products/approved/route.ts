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
        slug: item.product.slug,
        brand: item.product.brand,
        name: item.product.name,
        category: item.product.category,
        ingredientStatus: item.classroom.ingredientStatus,
        verificationStatus: item.formulation?.verificationStatus ?? null,
        lastVerifiedAt: item.formulation?.lastVerifiedAt ?? null,
      })),
      requestId(),
    ),
  );
}
