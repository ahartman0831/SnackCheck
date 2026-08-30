import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { publishRuleset } from "@/lib/rules/ruleset-admin";

const BodySchema = z.object({
  rulesetId: z.string().uuid(),
  expectedHash: z.string().regex(/^[0-9a-f]{64}$/),
  expectedReviewedAt: z.string().datetime({ offset: true }),
  confirmation: z.literal("PUBLISH"),
});

export async function POST(request: Request) {
  const id = requestId();
  const auth = await requireAdmin(["REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed || !auth.user) {
    return NextResponse.json(
      fail(
        "FORBIDDEN",
        "Reviewers cannot publish. Regulatory admin access is required.",
        {
          id,
        },
      ),
      { status: 403 },
    );
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      fail(
        "INVALID_BODY",
        "A reviewed ruleset, current hash, review timestamp, and typed PUBLISH confirmation are required.",
        { id },
      ),
      { status: 400 },
    );
  }
  try {
    await publishRuleset({
      rulesetId: parsed.data.rulesetId,
      expectedHash: parsed.data.expectedHash,
      expectedReviewedAt: parsed.data.expectedReviewedAt,
      requestId: id,
    });
    return NextResponse.json(ok({ published: true }, id));
  } catch (error) {
    const conflict =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "40001";
    return NextResponse.json(
      fail(
        conflict ? "EDIT_CONFLICT" : "PUBLISH_FAILED",
        conflict
          ? "The ruleset changed. Refresh before publishing."
          : "Ruleset publish failed.",
        { id },
      ),
      { status: conflict ? 409 : 400 },
    );
  }
}
