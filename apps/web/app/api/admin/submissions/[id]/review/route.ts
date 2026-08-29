import { NextResponse } from "next/server";
import { z } from "zod";
import type { Database } from "@snackcheck/db-types";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createUserServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  decision: z.enum(["REVIEW_PENDING", "APPROVED", "REJECTED"]),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  confirmed: z.literal(true),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = requestId();
  const auth = await requireAdmin(["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed) {
    return NextResponse.json(
      fail("FORBIDDEN", "Active reviewer access is required.", { id }),
      { status: 403 },
    );
  }

  const params = await context.params;
  const submissionId = z.string().uuid().safeParse(params.id);
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!submissionId.success || !body.success) {
    return NextResponse.json(
      fail(
        "INVALID_BODY",
        "A submission, decision, current timestamp, and explicit confirmation are required.",
        { id },
      ),
      { status: 400 },
    );
  }

  const userClient = await createUserServerClient();
  if (!userClient) {
    return NextResponse.json(
      fail("ADMIN_UNAVAILABLE", "The admin service is unavailable.", { id }),
      { status: 503 },
    );
  }

  type ModerationArgs = Database["public"]["Functions"]["moderate_submission"]["Args"];
  const moderate = userClient.rpc.bind(userClient) as unknown as (
    name: "moderate_submission",
    args: ModerationArgs,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
  const result = await moderate("moderate_submission", {
    p_submission_id: submissionId.data,
    p_expected_updated_at: body.data.expectedUpdatedAt,
    p_next_status: body.data.decision,
    p_request_id: id,
  });

  if (result.error) {
    const conflict = result.error.code === "40001";
    return NextResponse.json(
      fail(
        conflict ? "EDIT_CONFLICT" : "MODERATION_FAILED",
        conflict
          ? "This submission changed. Refresh before deciding."
          : "The moderation decision was not saved.",
        { id },
      ),
      { status: conflict ? 409 : 400 },
    );
  }

  return NextResponse.json(
    ok({ submissionId: submissionId.data, decision: body.data.decision }, id),
  );
}
