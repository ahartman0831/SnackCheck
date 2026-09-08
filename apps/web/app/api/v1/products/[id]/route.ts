import { catalogUnavailable } from "@/lib/api/unavailable";
import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { getProductBySlug } from "@/lib/products/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = requestId();
  const { id: slugOrId } = await context.params;
  try {
    const product = await getProductBySlug(slugOrId);
    if (!product) {
      return NextResponse.json(
        fail("NOT_FOUND", "No public product is available.", { id }),
        { status: 404 },
      );
    }
    return NextResponse.json(ok(product, id));
  } catch (error) {
    return catalogUnavailable(error, id, "/api/v1/products/[id]");
  }
}
