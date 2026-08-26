import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { getProductBySlug } from "@/lib/products/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = requestId();
  const { id: slugOrId } = await context.params;
  const product = await getProductBySlug(slugOrId);
  if (!product) {
    return NextResponse.json(
      fail("NOT_FOUND", "No public product is available.", { id }),
      { status: 404 },
    );
  }
  return NextResponse.json(ok(product, id));
}
