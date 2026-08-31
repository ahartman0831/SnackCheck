import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@snackcheck/db-types";

const ELIGIBLE_STATUSES = ["FAILED", "CANCELLED", "REJECTED"] as const;

export type RetentionCleanupResult = {
  mode: "dry-run" | "apply";
  candidates: number;
  purged: number;
  failed: number;
};

type CleanupOptions = {
  admin: SupabaseClient<Database>;
  apply: boolean;
  now?: Date;
  batchSize?: number;
};

export async function cleanupExpiredSubmissionAssets({
  admin,
  apply,
  now = new Date(),
  batchSize = 50,
}: CleanupOptions): Promise<RetentionCleanupResult> {
  const limit = Math.max(1, Math.min(250, Math.trunc(batchSize)));
  const candidates = await admin
    .from("submissions")
    .select(
      "id,status,product_id,raw_object_path,sanitized_object_path,evidence_asset_id,retention_until,image_sha256,raw_sha256,sanitized_sha256,raw_byte_size,sanitized_byte_size,sanitized_media_type,sanitized_width,sanitized_height,sanitizer_version,sanitized_at",
    )
    .in("status", [...ELIGIBLE_STATUSES])
    .is("product_id", null)
    .not("retention_until", "is", null)
    .lte("retention_until", now.toISOString())
    .order("retention_until", { ascending: true })
    .limit(limit);

  if (candidates.error) {
    throw new Error("RETENTION_CANDIDATE_QUERY_FAILED");
  }
  const rows = candidates.data ?? [];
  if (!apply) {
    return { mode: "dry-run", candidates: rows.length, purged: 0, failed: 0 };
  }

  let purged = 0;
  let failed = 0;
  for (const row of rows) {
    // Claim the exact still-eligible row before touching storage. This prevents a
    // concurrent product-link/review action from losing evidence after our query.
    const claimed = await admin
      .from("submissions")
      .update({
        evidence_asset_id: null,
        image_sha256: null,
        raw_object_path: null,
        sanitized_object_path: null,
        raw_sha256: null,
        sanitized_sha256: null,
        raw_byte_size: null,
        sanitized_byte_size: null,
        sanitized_media_type: null,
        sanitized_width: null,
        sanitized_height: null,
        sanitizer_version: null,
        sanitized_at: null,
        retention_until: null,
      })
      .eq("id", row.id)
      .in("status", [...ELIGIBLE_STATUSES])
      .is("product_id", null)
      .eq("retention_until", row.retention_until!)
      .select("id");

    if (claimed.error || claimed.data?.length !== 1) {
      failed += 1;
      continue;
    }

    const rawRemoval = row.raw_object_path
      ? await admin.storage.from("submission-raw").remove([row.raw_object_path])
      : { error: null };
    const sanitizedRemoval = row.sanitized_object_path
      ? await admin.storage
          .from("submission-sanitized")
          .remove([row.sanitized_object_path])
      : { error: null };

    if (rawRemoval.error || sanitizedRemoval.error) {
      await admin
        .from("submissions")
        .update({
          evidence_asset_id: row.evidence_asset_id,
          image_sha256: row.image_sha256,
          raw_object_path: row.raw_object_path,
          sanitized_object_path: row.sanitized_object_path,
          raw_sha256: row.raw_sha256,
          sanitized_sha256: row.sanitized_sha256,
          raw_byte_size: row.raw_byte_size,
          sanitized_byte_size: row.sanitized_byte_size,
          sanitized_media_type: row.sanitized_media_type,
          sanitized_width: row.sanitized_width,
          sanitized_height: row.sanitized_height,
          sanitizer_version: row.sanitizer_version,
          sanitized_at: row.sanitized_at,
          retention_until: row.retention_until,
        })
        .eq("id", row.id)
        .in("status", [...ELIGIBLE_STATUSES])
        .is("product_id", null)
        .is("retention_until", null);
      failed += 1;
      continue;
    }

    if (row.evidence_asset_id) {
      const evidenceDeletion = await admin
        .from("evidence_assets")
        .delete()
        .eq("id", row.evidence_asset_id)
        .lte("retention_until", now.toISOString());
      if (evidenceDeletion.error) {
        failed += 1;
        continue;
      }
    }
    purged += 1;
  }

  return { mode: "apply", candidates: rows.length, purged, failed };
}
