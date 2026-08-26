import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { getRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function POST() {
  const id = requestId();
  try {
    if (env.NODE_ENV === "production") {
      const { assertProductionExtractionReady } = await import("@/lib/env");
      assertProductionExtractionReady();
    }
  } catch (error) {
    return NextResponse.json(
      fail(
        "EXTRACTION_DISABLED",
        error instanceof Error ? error.message : "Extraction unavailable",
        { id },
      ),
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
  const admin = createAdminClient();
  let uploadUrl: string | null = null;

  if (admin) {
    await admin.from("submissions").insert({
      id: submissionId,
      status: "UPLOAD_PENDING",
    });
    const signed = await admin.storage.from("submission-raw").createSignedUploadUrl(path);
    uploadUrl = signed.data?.signedUrl ?? null;
  }

  const response = NextResponse.json(
    ok({ submissionId, path, uploadUrl, maxBytes: env.MAX_UPLOAD_BYTES }, id),
  );
  response.cookies.set("sc_submission", `${submissionId}.${id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
