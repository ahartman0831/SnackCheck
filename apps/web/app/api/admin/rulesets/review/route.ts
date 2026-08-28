import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { reviewRuleset } from "@/lib/rules/ruleset-admin";

const BodySchema = z.object({
  rulesetId: z.string().uuid(),
  reviewDocumentUrl: z.string().url(),
  reviewDocumentHash: z.string().min(32),
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
      fail("INVALID_BODY", "Review document URL and hash are required.", { id }),
      { status: 400 },
    );
  }
  try {
    await reviewRuleset({
      rulesetId: parsed.data.rulesetId,
      reviewerId: auth.user.id,
      reviewDocumentUrl: parsed.data.reviewDocumentUrl,
      reviewDocumentHash: parsed.data.reviewDocumentHash,
    });
    return NextResponse.json(ok({ reviewed: true }, id));
  } catch (error) {
    return NextResponse.json(
      fail(
        "REVIEW_FAILED",
        error instanceof Error ? error.message : "Ruleset review failed.",
        { id },
      ),
      { status: 400 },
    );
  }
}
