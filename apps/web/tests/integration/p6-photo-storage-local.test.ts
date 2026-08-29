import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { Database } from "@snackcheck/db-types";
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
});
