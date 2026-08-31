import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { Database } from "@snackcheck/db-types";
import { cleanupExpiredSubmissionAssets } from "@/lib/operations/retention-cleanup";
import { sanitizeIngredientImage } from "@/lib/submissions/image-sanitizer";

const enabled = process.env.LOCAL_SUPABASE_PHOTO_TEST === "true";
const localIt = enabled ? it : it.skip;

describe("Phase 6 local private-storage pipeline", () => {
  localIt(
    "stores only a metadata-free private derivative and deletes the raw object",
    async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      expect(url).toBeTruthy();
      expect(serviceKey).toBeTruthy();

      const admin = createClient<Database>(url!, serviceKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const submissionId = randomUUID();
      const rawPath = `${submissionId}/${randomUUID()}`;
      const raw = await sharp({
        create: { width: 1600, height: 900, channels: 3, background: "white" },
      })
        .withMetadata({ orientation: 6 })
        .png()
        .toBuffer();

      const created = await admin.from("submissions").insert({
        id: submissionId,
        status: "UPLOAD_PENDING",
        anonymous_key_hash: "a".repeat(64),
        token_expires_at: new Date(Date.now() + 60_000).toISOString(),
        raw_object_path: rawPath,
        retention_until: new Date(Date.now() + 60_000).toISOString(),
      });
      expect(created.error).toBeNull();

      const rawUpload = await admin.storage.from("submission-raw").upload(rawPath, raw, {
        contentType: "image/png",
        upsert: false,
      });
      expect(rawUpload.error).toBeNull();

      expect(
        (
          await admin
            .from("submissions")
            .update({ status: "UPLOADED" })
            .eq("id", submissionId)
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("submissions")
            .update({ status: "PROCESSING" })
            .eq("id", submissionId)
        ).error,
      ).toBeNull();

      const downloaded = await admin.storage.from("submission-raw").download(rawPath);
      expect(downloaded.error).toBeNull();
      const sanitized = await sanitizeIngredientImage(
        Buffer.from(await downloaded.data!.arrayBuffer()),
        {
          maxInputBytes: 12_582_912,
          maxOutputBytes: 3_145_728,
          maxOutputDimension: 2200,
        },
      );
      const sanitizedPath = `${submissionId}/${randomUUID()}.jpg`;
      expect(
        (
          await admin.storage
            .from("submission-sanitized")
            .upload(sanitizedPath, sanitized.buffer, { contentType: "image/jpeg" })
        ).error,
      ).toBeNull();

      const retentionUntil = new Date(Date.now() + 60_000).toISOString();
      const evidence = await admin
        .from("evidence_assets")
        .insert({
          bucket: "submission-sanitized",
          storage_path: sanitizedPath,
          media_type: "image/jpeg",
          byte_size: sanitized.byteSize,
          sha256: sanitized.sanitizedSha256,
          width: sanitized.width,
          height: sanitized.height,
          exif_stripped: sanitized.exifStripped,
          retention_until: retentionUntil,
        })
        .select("id")
        .single();
      expect(evidence.error).toBeNull();

      const completed = await admin
        .from("submissions")
        .update({
          status: "SANITIZED",
          evidence_asset_id: evidence.data!.id,
          image_sha256: sanitized.sanitizedSha256,
          sanitized_object_path: sanitizedPath,
          raw_sha256: createHash("sha256").update(raw).digest("hex"),
          sanitized_sha256: sanitized.sanitizedSha256,
          raw_byte_size: raw.byteLength,
          sanitized_byte_size: sanitized.byteSize,
          sanitized_media_type: "image/jpeg",
          sanitized_width: sanitized.width,
          sanitized_height: sanitized.height,
          sanitizer_version: sanitized.sanitizerVersion,
          sanitized_at: new Date().toISOString(),
          retention_until: retentionUntil,
        })
        .eq("id", submissionId);
      expect(completed.error).toBeNull();

      expect(
        (await admin.storage.from("submission-raw").remove([rawPath])).error,
      ).toBeNull();
      expect(
        (await admin.storage.from("submission-raw").download(rawPath)).error,
      ).not.toBeNull();

      const derivative = await admin.storage
        .from("submission-sanitized")
        .download(sanitizedPath);
      expect(derivative.error).toBeNull();
      const derivativeBuffer = Buffer.from(await derivative.data!.arrayBuffer());
      expect(createHash("sha256").update(derivativeBuffer).digest("hex")).toBe(
        sanitized.sanitizedSha256,
      );
      const metadata = await sharp(derivativeBuffer).metadata();
      expect(metadata.format).toBe("jpeg");
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.iptc).toBeUndefined();
    },
  );

  localIt("purges only expired, unlinked terminal submission assets", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(url).toBeTruthy();
    expect(serviceKey).toBeTruthy();

    const admin = createClient<Database>(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const expiredId = randomUUID();
    const pendingId = randomUUID();
    const expiredRawPath = `${expiredId}/raw.png`;
    const expiredSanitizedPath = `${expiredId}/sanitized.jpg`;
    const pendingRawPath = `${pendingId}/raw.png`;
    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    const file = Buffer.from("retention-fixture");
    const sha256 = createHash("sha256").update(file).digest("hex");

    expect(
      (
        await admin.storage.from("submission-raw").upload(expiredRawPath, file, {
          contentType: "image/png",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.storage
          .from("submission-sanitized")
          .upload(expiredSanitizedPath, file, { contentType: "image/jpeg" })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.storage.from("submission-raw").upload(pendingRawPath, file, {
          contentType: "image/png",
        })
      ).error,
    ).toBeNull();

    const evidence = await admin
      .from("evidence_assets")
      .insert({
        bucket: "submission-sanitized",
        storage_path: expiredSanitizedPath,
        media_type: "image/jpeg",
        byte_size: file.byteLength,
        sha256,
        exif_stripped: true,
        retention_until: expiredAt,
      })
      .select("id")
      .single();
    expect(evidence.error).toBeNull();

    expect(
      (
        await admin.from("submissions").insert([
          {
            id: expiredId,
            status: "CANCELLED",
            evidence_asset_id: evidence.data!.id,
            raw_object_path: expiredRawPath,
            sanitized_object_path: expiredSanitizedPath,
            sanitized_sha256: sha256,
            retention_until: expiredAt,
          },
          {
            id: pendingId,
            status: "UPLOAD_PENDING",
            raw_object_path: pendingRawPath,
            retention_until: expiredAt,
          },
        ])
      ).error,
    ).toBeNull();

    const dryRun = await cleanupExpiredSubmissionAssets({ admin, apply: false });
    expect(dryRun).toEqual({
      mode: "dry-run",
      candidates: 1,
      purged: 0,
      failed: 0,
    });

    const applied = await cleanupExpiredSubmissionAssets({ admin, apply: true });
    expect(applied).toEqual({ mode: "apply", candidates: 1, purged: 1, failed: 0 });
    expect(
      (await admin.storage.from("submission-raw").download(expiredRawPath)).error,
    ).not.toBeNull();
    expect(
      (await admin.storage.from("submission-sanitized").download(expiredSanitizedPath))
        .error,
    ).not.toBeNull();
    expect(
      (await admin.storage.from("submission-raw").download(pendingRawPath)).error,
    ).toBeNull();

    const expiredSubmission = await admin
      .from("submissions")
      .select("raw_object_path,sanitized_object_path,evidence_asset_id,retention_until")
      .eq("id", expiredId)
      .single();
    expect(expiredSubmission.data).toEqual({
      raw_object_path: null,
      sanitized_object_path: null,
      evidence_asset_id: null,
      retention_until: null,
    });
    expect(
      (
        await admin
          .from("evidence_assets")
          .select("id")
          .eq("id", evidence.data!.id)
          .maybeSingle()
      ).data,
    ).toBeNull();
  });
});
