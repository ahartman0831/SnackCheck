import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { env } from "@/lib/env";
import { isIngredientPhotoEnabled } from "@/lib/features";
import { getRateLimiter } from "@/lib/rate-limit";
import {
  ImageSanitizerError,
  sanitizeIngredientImage,
} from "@/lib/submissions/image-sanitizer";
import { ownsSubmission } from "@/lib/submissions/submission-ownership";
import { createAdminClient } from "@/lib/supabase/admin";

const BodySchema = z.object({
  path: z.string().min(1).max(500),
});

const SANITIZED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function isOwnedRawPath(path: string, submissionId: string): boolean {
  return (
    path.startsWith(`${submissionId}/`) &&
    path.length > submissionId.length + 1 &&
    !path.slice(submissionId.length + 1).includes("/")
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqId = requestId();
  const { id } = await context.params;
  const store = await cookies();
  const token = store.get("sc_submission")?.value ?? "";

  if (!isIngredientPhotoEnabled()) {
    return NextResponse.json(
      fail("PHOTO_DISABLED", "Ingredient photo processing is not enabled.", {
        id: reqId,
      }),
      { status: 404 },
    );
  }
  if (!(await ownsSubmission(token, id))) {
    return NextResponse.json(
      fail("FORBIDDEN", "This submission is not yours to process.", { id: reqId }),
      { status: 403 },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isOwnedRawPath(parsed.data.path, id)) {
    return NextResponse.json(
      fail("INVALID_UPLOAD_PATH", "The uploaded photo does not match this submission.", {
        id: reqId,
      }),
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      fail("PHOTO_DISABLED", "Ingredient photo processing is not configured.", {
        id: reqId,
      }),
      { status: 503 },
    );
  }

  try {
    const limiter = await getRateLimiter();
    const limited = await limiter.limit(`photo-sanitize:${id}`, 3, 60 * 60 * 1000);
    if (!limited.success) {
      return NextResponse.json(
        fail("PHOTO_DAILY_LIMIT", "Photo processing is paused for today.", {
          retryable: true,
          id: reqId,
        }),
        { status: 429 },
      );
    }

    const dailySlot = await admin.rpc(
      "claim_photo_processing_slot" as never,
      { p_limit: env.EXTRACTION_DAILY_LIMIT } as never,
    );
    if (dailySlot.error || dailySlot.data !== true) {
      return NextResponse.json(
        fail("PHOTO_KILL_SWITCH", "Photo processing is temporarily paused.", {
          retryable: true,
          id: reqId,
        }),
        { status: 503 },
      );
    }

    const uploaded = await admin
      .from("submissions")
      .update({ status: "UPLOADED" })
      .eq("id", id)
      .eq("status", "UPLOAD_PENDING")
      .select("id")
      .maybeSingle();
    if (uploaded.error || !uploaded.data) {
      const existing = await admin
        .from("submissions")
        .select("status, evidence_asset_id")
        .eq("id", id)
        .maybeSingle();
      if (String(existing.data?.status) === "SANITIZED") {
        return NextResponse.json(
          ok({ submissionId: id, status: "SANITIZED", idempotent: true }, reqId),
        );
      }
      return NextResponse.json(
        fail("SUBMISSION_STATE", "This submission cannot process another upload.", {
          id: reqId,
        }),
        { status: 409 },
      );
    }

    const claimed = await admin
      .from("submissions")
      .update({ status: "PROCESSING" })
      .eq("id", id)
      .eq("status", "UPLOADED")
      .select("id")
      .maybeSingle();
    if (claimed.error || !claimed.data) {
      return NextResponse.json(
        fail("SUBMISSION_BUSY", "This submission is already being processed.", {
          retryable: true,
          id: reqId,
        }),
        { status: 409 },
      );
    }

    const downloaded = await admin.storage
      .from("submission-raw")
      .download(parsed.data.path);
    if (downloaded.error || !downloaded.data) {
      throw new ImageSanitizerError(
        "MALFORMED_IMAGE",
        "The uploaded image could not be read.",
      );
    }

    const raw = Buffer.from(await downloaded.data.arrayBuffer());
    const sanitized = await sanitizeIngredientImage(raw, {
      maxInputBytes: env.MAX_UPLOAD_BYTES,
      maxOutputBytes: env.MAX_SANITIZED_IMAGE_BYTES,
      maxOutputDimension: env.MAX_IMAGE_DIMENSION,
    });
    const sanitizedPath = `${id}/${randomUUID()}.jpg`;
    const stored = await admin.storage
      .from("submission-sanitized")
      .upload(sanitizedPath, sanitized.buffer, {
        contentType: sanitized.sanitizedMediaType,
        upsert: false,
      });
    if (stored.error) {
      throw new ImageSanitizerError(
        "MALFORMED_IMAGE",
        "The sanitized image could not be stored.",
      );
    }

    const retentionUntil = new Date(Date.now() + SANITIZED_RETENTION_MS).toISOString();
    const evidence = await admin
      .from("evidence_assets")
      .insert({
        bucket: "submission-sanitized",
        storage_path: sanitizedPath,
        media_type: sanitized.sanitizedMediaType,
        byte_size: sanitized.byteSize,
        sha256: sanitized.sanitizedSha256,
        width: sanitized.width,
        height: sanitized.height,
        exif_stripped: sanitized.exifStripped,
        retention_until: retentionUntil,
      })
      .select("id")
      .single();
    if (evidence.error || !evidence.data) {
      await admin.storage.from("submission-sanitized").remove([sanitizedPath]);
      throw new ImageSanitizerError(
        "MALFORMED_IMAGE",
        "The sanitized image evidence could not be recorded.",
      );
    }

    const completed = await admin
      .from("submissions")
      .update({
        status: "SANITIZED",
        evidence_asset_id: evidence.data.id,
        image_sha256: sanitized.sanitizedSha256,
        raw_object_path: parsed.data.path,
        sanitized_object_path: sanitizedPath,
        raw_sha256: sanitized.rawSha256,
        sanitized_sha256: sanitized.sanitizedSha256,
        raw_byte_size: raw.length,
        sanitized_byte_size: sanitized.byteSize,
        sanitized_media_type: sanitized.sanitizedMediaType,
        sanitized_width: sanitized.width,
        sanitized_height: sanitized.height,
        sanitizer_version: sanitized.sanitizerVersion,
        sanitized_at: new Date().toISOString(),
        retention_until: retentionUntil,
      } as never)
      .eq("id", id)
      .eq("status", "PROCESSING")
      .select("id")
      .maybeSingle();
    if (completed.error || !completed.data) {
      await admin.storage.from("submission-sanitized").remove([sanitizedPath]);
      throw new ImageSanitizerError(
        "MALFORMED_IMAGE",
        "The sanitized image could not be finalized.",
      );
    }

    await admin.storage.from("submission-raw").remove([parsed.data.path]);

    return NextResponse.json(
      ok(
        {
          submissionId: id,
          status: "SANITIZED",
          width: sanitized.width,
          height: sanitized.height,
        },
        reqId,
      ),
      { status: 202 },
    );
  } catch (error) {
    const code =
      error instanceof ImageSanitizerError ? error.code : "SANITIZATION_FAILED";
    await admin
      .from("submissions")
      .update({ status: "FAILED", failure_code: code })
      .eq("id", id)
      .eq("status", "PROCESSING");
    await admin.storage.from("submission-raw").remove([parsed.data.path]);

    return NextResponse.json(
      fail(
        code,
        "The photo could not be processed safely. Try another photo or paste the ingredients instead.",
        {
          retryable: true,
          id: reqId,
        },
      ),
      { status: 422 },
    );
  }
}
