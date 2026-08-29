import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { getRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import {
  createSubmissionToken,
  hashSubmissionToken,
} from "@/lib/submissions/submission-token";
import { isIngredientPhotoEnabled } from "@/lib/features";

export async function POST() {
  const id = requestId();
  if (!env.SUBMISSION_TOKEN_SECRET) {
    return NextResponse.json(
      fail("SUBMISSIONS_DISABLED", "Ingredient submissions are not configured.", { id }),
      { status: 503 },
    );
  }

  const limiter = await getRateLimiter();
  const limited = await limiter.limit("upload:public", 6, 60_000);
  if (!limited.success) {
    return NextResponse.json(
      fail("RATE_LIMITED", "Upload limit reached.", { retryable: true, id }),
      { status: 429 },
    );
  }

  const submissionId = randomUUID();
  const path = `${submissionId}/${randomUUID()}`;
  const { token, payload } = createSubmissionToken({
    submissionId,
    secret: env.SUBMISSION_TOKEN_SECRET,
  });
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      fail("SUBMISSIONS_DISABLED", "Ingredient submissions are not configured.", {
        id,
      }),
      { status: 503 },
    );
  }

  let uploadUrl: string | null = null;

  const inserted = await admin.from("submissions").insert({
    id: submissionId,
    status: "UPLOAD_PENDING",
    anonymous_key_hash: hashSubmissionToken(token),
    token_version: payload.version,
    token_expires_at: new Date(payload.expiresAt * 1000).toISOString(),
    raw_object_path: isIngredientPhotoEnabled() ? path : null,
    retention_until: new Date(payload.expiresAt * 1000).toISOString(),
  });
  if (inserted.error) {
    return NextResponse.json(
      fail("SUBMISSION_CREATE_FAILED", "The submission could not be started.", {
        retryable: true,
        id,
      }),
      { status: 503 },
    );
  }

  if (isIngredientPhotoEnabled()) {
    const signed = await admin.storage.from("submission-raw").createSignedUploadUrl(path);
    if (signed.error || !signed.data?.signedUrl) {
      await admin
        .from("submissions")
        .update({ status: "FAILED", failure_code: "SIGNED_UPLOAD_FAILED" })
        .eq("id", submissionId);
      return NextResponse.json(
        fail("UPLOAD_UNAVAILABLE", "Photo upload is temporarily unavailable.", {
          retryable: true,
          id,
        }),
        { status: 503 },
      );
    }
    uploadUrl = signed.data?.signedUrl ?? null;
  }

  const response = NextResponse.json(
    ok(
      {
        submissionId,
        path: uploadUrl ? path : null,
        uploadUrl,
        maxBytes: env.MAX_UPLOAD_BYTES,
      },
      id,
    ),
  );
  response.cookies.set("sc_submission", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api/v1/submissions/",
    maxAge: payload.expiresAt - payload.issuedAt,
  });
  return response;
}
