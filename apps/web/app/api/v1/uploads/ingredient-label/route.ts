import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { enforceRateLimit } from "@/lib/rate-limit/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import {
  createSubmissionToken,
  hashSubmissionToken,
} from "@/lib/submissions/submission-token";
import { isIngredientPhotoEnabled } from "@/lib/features";
import { normalizeGtin } from "@/lib/gtin";

const BodySchema = z.object({ gtin: z.string().max(32).nullish() });

export async function POST(request: Request) {
  const id = requestId();
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  const normalized =
    body.success && body.data.gtin ? normalizeGtin(body.data.gtin) : null;
  if (!body.success || (normalized && "error" in normalized)) {
    return NextResponse.json(
      fail("INVALID_BODY", "Provide a valid barcode or leave it empty.", { id }),
      { status: 400 },
    );
  }
  if (!env.SUBMISSION_TOKEN_SECRET) {
    return NextResponse.json(
      fail("SUBMISSIONS_DISABLED", "Ingredient submissions are not configured.", { id }),
      { status: 503 },
    );
  }

  const rateLimit = await enforceRateLimit({
    request,
    scope: "upload",
    max: 6,
    windowMs: 60000,
    requestId: id,
  });
  if (rateLimit) return rateLimit;

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

  const normalizedGtin = normalized && "gtin14" in normalized ? normalized.gtin14 : null;
  const product = normalizedGtin
    ? await admin.from("products").select("id").eq("gtin14", normalizedGtin).maybeSingle()
    : null;

  const inserted = await admin.from("submissions").insert({
    id: submissionId,
    status: "UPLOAD_PENDING",
    anonymous_key_hash: hashSubmissionToken(token),
    token_version: payload.version,
    token_expires_at: new Date(payload.expiresAt * 1000).toISOString(),
    raw_object_path: isIngredientPhotoEnabled() ? path : null,
    retention_until: new Date(payload.expiresAt * 1000).toISOString(),
    normalized_gtin14: normalizedGtin,
    product_id: product?.data?.id ?? null,
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
