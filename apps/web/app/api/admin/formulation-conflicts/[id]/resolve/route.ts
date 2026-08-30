import { NextResponse } from "next/server";
import { z } from "zod";
import type { Database } from "@snackcheck/db-types";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createUserServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  decision: z.enum(["LEFT", "RIGHT", "NEITHER"]),
  leftUpdatedAt: z.string().datetime({ offset: true }),
  rightUpdatedAt: z.string().datetime({ offset: true }),
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
  const conflictId = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!conflictId.success || !body.success)
    return NextResponse.json(
      fail(
        "INVALID_BODY",
        "A conflict, current evidence timestamps, decision, and explicit confirmation are required.",
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
  type Args = Database["public"]["Functions"]["resolve_formulation_conflict"]["Args"];
  const resolve = userClient.rpc.bind(userClient) as unknown as (
    name: "resolve_formulation_conflict",
    args: Args,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
  const result = await resolve("resolve_formulation_conflict", {
    p_conflict_id: conflictId.data,
    p_decision: body.data.decision,
    p_expected_left_updated_at: body.data.leftUpdatedAt,
    p_expected_right_updated_at: body.data.rightUpdatedAt,
    p_request_id: id,
  });
  if (result.error) {
    const conflict = result.error.code === "40001";
    return NextResponse.json(
      fail(
        conflict ? "EDIT_CONFLICT" : "RESOLUTION_FAILED",
        conflict
          ? "The conflict evidence changed. Refresh before deciding."
          : "The conflict decision was not saved.",
        { id },
      ),
      { status: conflict ? 409 : 400 },
    );
  }
  return NextResponse.json(
    ok({ conflictId: conflictId.data, decision: body.data.decision }, id),
  );
}
