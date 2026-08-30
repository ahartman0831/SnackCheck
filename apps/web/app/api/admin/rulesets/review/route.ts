import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { reviewRuleset } from "@/lib/rules/ruleset-admin";

const BodySchema = z.object({
  rulesetId: z.string().uuid(),
  expectedHash: z.string().regex(/^[0-9a-f]{64}$/),
  reviewDocumentUrl: z.string().url().startsWith("https://"),
  reviewDocumentHash: z.string().regex(/^[0-9a-f]{64}$/),
  confirmed: z.literal(true),
});

export async function POST(request: Request) {
  const id = requestId();
  const auth = await requireAdmin(["REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed || !auth.user) {
    return NextResponse.json(
      fail("FORBIDDEN", "Regulatory admin access is required to record a review.", {
        id,
      }),
      { status: 403 },
    );
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      fail(
        "INVALID_BODY",
        "A current ruleset hash, HTTPS review document, lowercase SHA-256, and explicit confirmation are required.",
        { id },
      ),
      { status: 400 },
    );
  }
  try {
    await reviewRuleset({
      rulesetId: parsed.data.rulesetId,
      expectedHash: parsed.data.expectedHash,
      reviewDocumentUrl: parsed.data.reviewDocumentUrl,
      reviewDocumentHash: parsed.data.reviewDocumentHash,
      requestId: id,
    });
    return NextResponse.json(ok({ reviewed: true }, id));
  } catch (error) {
    const conflict =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "40001";
    return NextResponse.json(
      fail(
        conflict ? "EDIT_CONFLICT" : "REVIEW_FAILED",
        conflict
          ? "The ruleset changed. Refresh before reviewing."
          : "Ruleset review failed.",
        { id },
      ),
      { status: conflict ? 409 : 400 },
    );
  }
}
