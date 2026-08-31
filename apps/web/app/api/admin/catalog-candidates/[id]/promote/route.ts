import { NextResponse } from "next/server";
import { z } from "zod";
import {
  evaluateCompliance,
  hashFormulation,
  parseIngredients,
} from "@snackcheck/compliance";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { requireAdmin } from "@/lib/auth/require-admin";
import { loadPublishedArizonaRuleset } from "@/lib/rules/arizona";
import { createUserServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  brand: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(200),
  variant: z.string().trim().max(160),
  size: z.string().trim().max(100),
  category: z.string().trim().max(160),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(96),
  individuallyPackaged: z.boolean(),
  verifiedIngredientText: z.string().trim().min(1).max(20_000),
  evidenceUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !/(^|\.)(nal\.usda\.gov|openfoodfacts\.org)$/i.test(url.hostname)
      );
    }, "Use an independent HTTPS manufacturer page, not USDA or Open Food Facts."),
  evidenceTitle: z.string().trim().min(1).max(300),
  observedAt: z
    .string()
    .datetime({ offset: true })
    .refine(
      (value) => Date.parse(value) <= Date.now(),
      "Evidence cannot be dated in the future.",
    ),
  confirmed: z.literal(true),
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
  const candidateId = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!candidateId.success || !body.success)
    return NextResponse.json(
      fail(
        "INVALID_BODY",
        "Confirmed product fields and independent manufacturer evidence are required.",
        { id, fieldErrors: body.success ? undefined : body.error.flatten().fieldErrors },
      ),
      { status: 400 },
    );
  const parsed = parseIngredients(body.data.verifiedIngredientText);
  if (!parsed.ingredients.length)
    return NextResponse.json(
      fail("INVALID_INGREDIENTS", "The confirmed ingredient text could not be parsed.", {
        id,
      }),
      { status: 400 },
    );
  const formulationHash = hashFormulation({
    rawIngredients: body.data.verifiedIngredientText,
    ingredients: parsed.ingredients,
  });
  const ruleset = await loadPublishedArizonaRuleset();
  const evaluationResult = evaluateCompliance({
    formulation: {
      id: candidateId.data,
      hash: formulationHash,
      rawIngredients: body.data.verifiedIngredientText,
      ingredients: parsed.ingredients,
      verificationStatus: "VERIFIED",
      confidence: 1,
      lastVerifiedAt: body.data.observedAt,
      conflict: false,
    },
    ruleset,
    context: "CLASSROOM_DISTRIBUTION",
    evaluationDate: body.data.observedAt.slice(0, 10),
    parserWarnings: parsed.warnings,
  });
  const client = await createUserServerClient();
  if (!client)
    return NextResponse.json(
      fail("ADMIN_UNAVAILABLE", "The admin service is unavailable.", { id }),
      { status: 503 },
    );
  const rpc = client.rpc.bind(client) as unknown as (
    name: "admin_promote_catalog_candidate",
    args: {
      p_candidate_id: string;
      p_expected_updated_at: string;
      p_promotion: object;
      p_request_id: string;
    },
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
  const result = await rpc("admin_promote_catalog_candidate", {
    p_candidate_id: candidateId.data,
    p_expected_updated_at: body.data.expectedUpdatedAt,
    p_promotion: {
      brand: body.data.brand,
      name: body.data.name,
      variant: body.data.variant,
      size: body.data.size,
      category: body.data.category,
      slug: body.data.slug,
      individuallyPackaged: body.data.individuallyPackaged,
      verifiedIngredientText: body.data.verifiedIngredientText,
      normalizedIngredientText: parsed.normalizedText,
      formulationHash,
      ingredients: parsed.ingredients,
      evidenceUrl: body.data.evidenceUrl,
      evidenceTitle: body.data.evidenceTitle,
      observedAt: body.data.observedAt,
      evaluationResult,
    },
    p_request_id: id,
  });
  if (result.error) {
    const stale = result.error.code === "40001";
    return NextResponse.json(
      fail(
        stale ? "EDIT_CONFLICT" : "PROMOTION_FAILED",
        stale
          ? "This candidate changed. Refresh before promoting."
          : "The candidate was not promoted.",
        { id },
      ),
      { status: stale ? 409 : 400 },
    );
  }
  return NextResponse.json(
    ok(
      {
        candidateId: candidateId.data,
        formulationHash,
        evaluation: evaluationResult.ingredientStatus,
      },
      id,
    ),
  );
}
