import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { cloneRulesetToDraft } from "@/lib/rules/ruleset-admin";

const BodySchema = z.object({
  sourceRulesetId: z.string().uuid(),
});

export async function POST(request: Request) {
  const id = requestId();
  const auth = await requireAdmin(["REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed) {
    return NextResponse.json(
      fail("FORBIDDEN", "Regulatory admin access is required to clone a ruleset.", {
        id,
      }),
      { status: 403 },
    );
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      fail("INVALID_BODY", "sourceRulesetId is required.", { id }),
      { status: 400 },
    );
  }
  try {
    const draftId = await cloneRulesetToDraft(parsed.data.sourceRulesetId);
    return NextResponse.json(ok({ draftRulesetId: draftId }, id));
  } catch (error) {
    return NextResponse.json(
      fail(
        "CLONE_FAILED",
        error instanceof Error ? error.message : "Ruleset clone failed.",
        { id },
      ),
      { status: 400 },
    );
  }
}
