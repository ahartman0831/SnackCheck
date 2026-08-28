import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { ownsSubmission } from "@/lib/submissions/submission-ownership";
import { createAdminClient } from "@/lib/supabase/admin";

type SubmissionPaths = {
  status: string;
  raw_object_path: string | null;
  sanitized_object_path: string | null;
};

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqId = requestId();
  const { id } = await context.params;
  const store = await cookies();
  const token = store.get("sc_submission")?.value ?? "";
  if (!(await ownsSubmission(token, id))) {
    return NextResponse.json(
      fail("FORBIDDEN", "This submission is not yours to cancel.", { id: reqId }),
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      fail("SUBMISSIONS_DISABLED", "Ingredient submissions are unavailable.", {
        id: reqId,
      }),
      { status: 503 },
    );
  }

  const found = await admin
    .from("submissions")
    .select("status, raw_object_path, sanitized_object_path")
    .eq("id", id)
    .maybeSingle();
  const submission = found.data as unknown as SubmissionPaths | null;
  if (found.error || !submission) {
    return NextResponse.json(fail("NOT_FOUND", "Submission not found.", { id: reqId }), {
      status: 404,
    });
  }

  const updated = await admin
    .from("submissions")
    .update({ status: "CANCELLED", anonymous_key_hash: null } as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (updated.error || !updated.data) {
    return NextResponse.json(
      fail("CANCEL_FAILED", "The submission could not be cancelled.", {
        retryable: true,
        id: reqId,
      }),
      { status: 409 },
    );
  }

  if (submission.raw_object_path) {
    await admin.storage.from("submission-raw").remove([submission.raw_object_path]);
  }
  if (submission.sanitized_object_path) {
    await admin.storage
      .from("submission-sanitized")
      .remove([submission.sanitized_object_path]);
  }

  const response = NextResponse.json(ok({ submissionId: id, cancelled: true }, reqId));
  response.cookies.set("sc_submission", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/submissions/",
    maxAge: 0,
  });
  return response;
}
