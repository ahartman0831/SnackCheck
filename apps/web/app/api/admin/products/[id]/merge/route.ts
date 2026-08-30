import { NextResponse } from "next/server";
import { z } from "zod";
import type { Database } from "@snackcheck/db-types";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createUserServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  targetProductId: z.string().uuid(),
  sourceUpdatedAt: z.string().datetime({ offset: true }),
  targetUpdatedAt: z.string().datetime({ offset: true }),
  confirmed: z.literal(true),
  confirmation: z.literal("MERGE"),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = requestId();
  const auth = await requireAdmin(["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed)
    return NextResponse.json(
      fail("FORBIDDEN", "Active reviewer access is required.", { id }),
      { status: 403 },
    );
  const sourceId = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!sourceId.success || !body.success)
    return NextResponse.json(
      fail(
        "INVALID_BODY",
        "Two current products and explicit MERGE confirmation are required.",
        { id },
      ),
      { status: 400 },
    );
  const userClient = await createUserServerClient();
  if (!userClient)
    return NextResponse.json(
      fail("ADMIN_UNAVAILABLE", "The admin service is unavailable.", { id }),
      { status: 503 },
    );
  type Args = Database["public"]["Functions"]["admin_merge_products"]["Args"];
  const merge = userClient.rpc.bind(userClient) as unknown as (
    name: "admin_merge_products",
    args: Args,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
  const result = await merge("admin_merge_products", {
    p_source_product_id: sourceId.data,
    p_target_product_id: body.data.targetProductId,
    p_expected_source_updated_at: body.data.sourceUpdatedAt,
    p_expected_target_updated_at: body.data.targetUpdatedAt,
    p_request_id: id,
  });
  if (result.error) {
    const conflict = result.error.code === "40001";
    return NextResponse.json(
      fail(
        conflict ? "EDIT_CONFLICT" : "MERGE_FAILED",
        conflict
          ? "A product changed. Refresh before merging."
          : "The products were not merged. Resolve conflicts or duplicate evidence first.",
        { id },
      ),
      { status: conflict ? 409 : 400 },
    );
  }
  return NextResponse.json(
    ok(
      { sourceProductId: sourceId.data, targetProductId: body.data.targetProductId },
      id,
    ),
  );
}
