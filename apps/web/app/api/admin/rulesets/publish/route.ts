import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { publishRuleset } from "@/lib/rules/ruleset-admin";

const BodySchema = z.object({
  rulesetId: z.string().uuid(),
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
    return NextResponse.json(fail("INVALID_BODY", "rulesetId is required.", { id }), {
      status: 400,
    });
  }
  try {
    await publishRuleset({
      rulesetId: parsed.data.rulesetId,
      publisherId: auth.user.id,
    });
    return NextResponse.json(ok({ published: true }, id));
  } catch (error) {
    return NextResponse.json(
      fail(
        "PUBLISH_FAILED",
        error instanceof Error ? error.message : "Ruleset publish failed.",
        { id },
      ),
      { status: 400 },
    );
  }
}
