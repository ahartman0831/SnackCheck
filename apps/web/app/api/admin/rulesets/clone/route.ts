import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { cloneRulesetToDraft } from "@/lib/rules/ruleset-admin";

const BodySchema = z.object({
  sourceRulesetId: z.string().uuid(),
  expectedHash: z.string().regex(/^[0-9a-f]{64}$/),
  confirmed: z.literal(true),
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
      fail(
        "INVALID_BODY",
        "A source, current hash, and explicit confirmation are required.",
        { id },
      ),
      { status: 400 },
    );
  }
  try {
    const draftId = await cloneRulesetToDraft({
      sourceRulesetId: parsed.data.sourceRulesetId,
      expectedHash: parsed.data.expectedHash,
      requestId: id,
    });
    return NextResponse.json(ok({ draftRulesetId: draftId }, id));
  } catch (error) {
    const conflict =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "40001";
    return NextResponse.json(
      fail(
        conflict ? "EDIT_CONFLICT" : "CLONE_FAILED",
        conflict
          ? "The ruleset changed. Refresh before cloning."
          : "Ruleset clone failed.",
        { id },
      ),
      { status: conflict ? 409 : 400 },
    );
  }
}
