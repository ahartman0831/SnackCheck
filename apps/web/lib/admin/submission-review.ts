import "server-only";
import type { Json } from "@snackcheck/db-types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const REVIEW_ROLES = ["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"] as const;

export type SubmissionReviewRecord = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  confidence: number | null;
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  extractedText: string | null;
  confirmedText: string | null;
  extractedIngredients: Json | null;
  evaluationResult: Json | null;
  failureCode: string | null;
  failureDetail: string | null;
  gtin14: string | null;
  imageUrl: string | null;
  image: {
    mediaType: string;
    byteSize: number;
    width: number | null;
    height: number | null;
    exifStripped: boolean;
    retentionUntil: string | null;
  } | null;
  product: {
    id: string;
    brand: string;
    name: string;
    slug: string;
    active: boolean;
  } | null;
  attempts: Array<{
    id: string;
    ordinal: number;
    occurredAt: string;
    provider: string;
    model: string;
    promptVersion: string;
    outcome: string;
    failureCode: string | null;
    latencyMs: number;
    costUsd: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
  }>;
  audit: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    requestId: string | null;
    createdAt: string;
    before: Json | null;
    after: Json | null;
  }>;
};

export type SubmissionReviewResult =
  | { kind: "unauthorized" }
  | { kind: "not-found" }
  | {
      kind: "ready";
      role: (typeof REVIEW_ROLES)[number];
      record: SubmissionReviewRecord;
    };

export async function getSubmissionReview(id: string): Promise<SubmissionReviewResult> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed || !auth.role) return { kind: "unauthorized" };
  const admin = createAdminClient();
  if (!admin) return { kind: "unauthorized" };

  const submission = await admin
    .from("submissions")
    .select(
      "id,status,created_at,updated_at,confirmed_at,extraction_confidence,extraction_provider,extraction_model,prompt_version,extracted_raw_text,corrected_text,extracted_ingredients,evaluation_result_json,failure_code,failure_detail_safe,normalized_gtin14,sanitized_object_path,evidence_asset_id,product_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (submission.error) throw new Error("The submission could not be loaded.");
  if (!submission.data) return { kind: "not-found" };

  const row = submission.data;
  const [attempts, usage, audit, product, evidence, signedImage] = await Promise.all([
    admin
      .from("extraction_attempts")
      .select(
        "id,attempt_ordinal,created_at,provider,model,prompt_version,outcome,failure_code,latency_ms",
      )
      .eq("submission_id", id)
      .order("attempt_ordinal", { ascending: true }),
    admin
      .from("ai_usage_ledger")
      .select(
        "extraction_attempt_id,estimated_total_cost_usd,input_tokens,output_tokens,reasoning_tokens",
      )
      .eq("submission_id", id),
    admin
      .from("admin_audit_log")
      .select("id,action,actor_user_id,request_id,created_at,before_json,after_json")
      .eq("entity_type", "submission")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
    row.product_id
      ? admin
          .from("products")
          .select("id,brand,name,slug,active")
          .eq("id", row.product_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.evidence_asset_id
      ? admin
          .from("evidence_assets")
          .select("media_type,byte_size,width,height,exif_stripped,retention_until")
          .eq("id", row.evidence_asset_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.sanitized_object_path
      ? admin.storage
          .from("submission-sanitized")
          .createSignedUrl(row.sanitized_object_path, 300)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (
    [attempts, usage, audit, product, evidence, signedImage].some(
      (result) => result.error,
    )
  ) {
    throw new Error("Some private submission evidence could not be loaded.");
  }

  const usageByAttempt = new Map(
    (usage.data ?? []).map((item) => [item.extraction_attempt_id, item]),
  );

  return {
    kind: "ready",
    role: auth.role,
    record: {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      confirmedAt: row.confirmed_at,
      confidence: row.extraction_confidence,
      provider: row.extraction_provider,
      model: row.extraction_model,
      promptVersion: row.prompt_version,
      extractedText: row.extracted_raw_text,
      confirmedText: row.corrected_text,
      extractedIngredients: row.extracted_ingredients,
      evaluationResult: row.evaluation_result_json,
      failureCode: row.failure_code,
      failureDetail: row.failure_detail_safe,
      gtin14: row.normalized_gtin14,
      imageUrl: signedImage.data?.signedUrl ?? null,
      image: evidence.data
        ? {
            mediaType: evidence.data.media_type,
            byteSize: evidence.data.byte_size,
            width: evidence.data.width,
            height: evidence.data.height,
            exifStripped: evidence.data.exif_stripped,
            retentionUntil: evidence.data.retention_until,
          }
        : null,
      product: product.data,
      attempts: (attempts.data ?? []).map((attempt) => {
        const attemptUsage = usageByAttempt.get(attempt.id);
        return {
          id: attempt.id,
          ordinal: attempt.attempt_ordinal,
          occurredAt: attempt.created_at,
          provider: attempt.provider,
          model: attempt.model,
          promptVersion: attempt.prompt_version,
          outcome: attempt.outcome,
          failureCode: attempt.failure_code,
          latencyMs: attempt.latency_ms,
          costUsd:
            attemptUsage?.estimated_total_cost_usd == null
              ? null
              : Number(attemptUsage.estimated_total_cost_usd),
          inputTokens: attemptUsage?.input_tokens ?? null,
          outputTokens: attemptUsage?.output_tokens ?? null,
          reasoningTokens: attemptUsage?.reasoning_tokens ?? null,
        };
      }),
      audit: (audit.data ?? []).map((item) => ({
        id: item.id,
        action: item.action,
        actorUserId: item.actor_user_id,
        requestId: item.request_id,
        createdAt: item.created_at,
        before: item.before_json,
        after: item.after_json,
      })),
    },
  };
}
