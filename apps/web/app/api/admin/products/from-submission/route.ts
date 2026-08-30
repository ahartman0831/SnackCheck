import { NextResponse } from "next/server";
import { z } from "zod";
import { parseIngredients } from "@snackcheck/compliance";
import type { Database } from "@snackcheck/db-types";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  submissionId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  brand: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(200),
  variant: z.string().trim().max(160),
  size: z.string().trim().max(80),
  category: z.string().trim().max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(96),
  individuallyPackaged: z.boolean(),
  confirmed: z.literal(true),
});

export async function POST(request: Request) {
  const id = requestId();
  const auth = await requireAdmin(["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed)
    return NextResponse.json(
      fail("FORBIDDEN", "Active reviewer access is required.", { id }),
      { status: 403 },
    );
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      fail(
        "INVALID_BODY",
        "Verified product details and explicit confirmation are required.",
        { id },
      ),
      { status: 400 },
    );
  const admin = createAdminClient();
  const userClient = await createUserServerClient();
  if (!admin || !userClient)
    return NextResponse.json(
      fail("ADMIN_UNAVAILABLE", "The admin service is unavailable.", { id }),
      { status: 503 },
    );
  const submission = await admin
    .from("submissions")
    .select("corrected_text,normalized_gtin14")
    .eq("id", body.data.submissionId)
    .maybeSingle();
  if (
    submission.error ||
    !submission.data?.corrected_text ||
    !submission.data.normalized_gtin14
  )
    return NextResponse.json(
      fail("SUBMISSION_EVIDENCE", "Confirmed package evidence is unavailable.", { id }),
      { status: 409 },
    );
  const parsed = parseIngredients(submission.data.corrected_text);
  if (!parsed.ingredients.length)
    return NextResponse.json(
      fail("SUBMISSION_EVIDENCE", "The confirmed ingredient text could not be parsed.", {
        id,
      }),
      { status: 409 },
    );
  type Args =
    Database["public"]["Functions"]["admin_create_product_from_submission"]["Args"];
  const create = userClient.rpc.bind(userClient) as unknown as (
    name: "admin_create_product_from_submission",
    args: Args,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
  const result = await create("admin_create_product_from_submission", {
    p_submission_id: body.data.submissionId,
    p_expected_submission_updated_at: body.data.expectedUpdatedAt,
    p_brand: body.data.brand,
    p_name: body.data.name,
    p_variant: body.data.variant,
    p_size: body.data.size,
    p_category: body.data.category,
    p_slug: body.data.slug,
    p_individually_packaged: body.data.individuallyPackaged,
    p_identifier_type: "GTIN_14",
    p_raw_identifier: submission.data.normalized_gtin14,
    p_normalized_ingredient_text: parsed.normalizedText,
    p_ingredients: parsed.ingredients,
    p_request_id: id,
  });
  if (result.error) {
    const conflict = result.error.code === "40001" || result.error.code === "23505";
    return NextResponse.json(
      fail(
        conflict ? "EDIT_CONFLICT" : "CREATE_FAILED",
        conflict
          ? "The submission changed or its barcode already exists. Refresh before creating a product."
          : "The product was not created from this evidence.",
        { id },
      ),
      { status: conflict ? 409 : 400 },
    );
  }
  const data = result.data as { product_id?: string } | null;
  return NextResponse.json(ok({ productId: data?.product_id }, id));
}
