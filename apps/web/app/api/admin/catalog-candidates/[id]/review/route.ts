import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createUserServerClient } from "@/lib/supabase/server";

const BodySchema = z
  .object({
    decision: z.enum(["QUEUE", "REJECT"]),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    reason: z.string().max(2000),
    confirmed: z.literal(true),
  })
  .superRefine((value, context) => {
    if (value.decision === "REJECT" && value.reason.trim().length < 8)
      context.addIssue({
        code: "custom",
        message: "A rejection reason is required.",
        path: ["reason"],
      });
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
        "A candidate, current timestamp, valid decision, and explicit confirmation are required.",
        { id },
      ),
      { status: 400 },
    );
  const client = await createUserServerClient();
  if (!client)
    return NextResponse.json(
      fail("ADMIN_UNAVAILABLE", "The admin service is unavailable.", { id }),
      { status: 503 },
    );
  const rpc = client.rpc.bind(client) as unknown as (
    name: "admin_review_catalog_candidate",
    args: {
      p_candidate_id: string;
      p_expected_updated_at: string;
      p_decision: string;
      p_reason: string;
      p_request_id: string;
    },
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
  const result = await rpc("admin_review_catalog_candidate", {
    p_candidate_id: candidateId.data,
    p_expected_updated_at: body.data.expectedUpdatedAt,
    p_decision: body.data.decision,
    p_reason: body.data.reason,
    p_request_id: id,
  });
  if (result.error) {
    const stale = result.error.code === "40001";
    return NextResponse.json(
      fail(
        stale ? "EDIT_CONFLICT" : "REVIEW_FAILED",
        stale
          ? "This candidate changed. Refresh before deciding."
          : "The review decision was not saved.",
        { id },
      ),
      { status: stale ? 409 : 400 },
    );
  }
  return NextResponse.json(
    ok({ candidateId: candidateId.data, decision: body.data.decision }, id),
  );
}
