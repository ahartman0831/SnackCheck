import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  IngredientExtractionSchema,
  type IngredientExtraction,
} from "@snackcheck/contracts";
import { orchestrateExtraction } from "@/lib/ai/orchestrator";
import { EXTRACTION_PROMPT_VERSION } from "@/lib/ai/prompt-registry";
import { createExtractionProviders } from "@/lib/ai/provider-factory";
import { fail, ok, requestId } from "@/lib/api/envelope";
import { env } from "@/lib/env";
import { isPhotoExtractionEnabled } from "@/lib/features";
import { getRateLimiter } from "@/lib/rate-limit";
import { ownsSubmission } from "@/lib/submissions/submission-ownership";
import { createAdminClient } from "@/lib/supabase/admin";

const BodySchema = z.object({
  pastedText: z.string().trim().min(1).max(10_000).optional(),
});

type SubmissionExtractionRow = {
  status: string;
  sanitized_object_path: string | null;
  sanitized_sha256: string | null;
  sanitized_media_type: string | null;
  extracted_ingredients: unknown;
};

function pastedExtraction(pasted: string): IngredientExtraction {
  return IngredientExtractionSchema.parse({
    panelFound: true,
    rawText: pasted,
    ingredientText: pasted,
    ingredients: pasted.split(",").map((raw) => ({
      raw: raw.trim(),
      normalizedSuggestion: raw.trim().toLowerCase(),
      confidence: 0.5,
      startOffset: null,
      endOffset: null,
    })),
    overallConfidence: 0.5,
    warnings: [],
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqId = requestId();
  const { id } = await context.params;
  const store = await cookies();
  const token = store.get("sc_submission")?.value ?? "";
  if (!(await ownsSubmission(token, id))) {
    return NextResponse.json(
      fail("FORBIDDEN", "This submission is not yours to process.", { id: reqId }),
      { status: 403 },
    );
  }

  const limiter = await getRateLimiter();
  const limited = await limiter.limit(`extract:${id}`, 4, 60_000);
  if (!limited.success) {
    return NextResponse.json(
      fail(
        "RATE_LIMITED",
        "Extraction is temporarily unavailable. Paste the ingredient list or try again later.",
        { retryable: true, id: reqId },
      ),
      { status: 429 },
    );
  }

  const body = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      fail("INVALID_BODY", "The extraction request was invalid.", { id: reqId }),
      { status: 400 },
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
    .select(
      "status, sanitized_object_path, sanitized_sha256, sanitized_media_type, extracted_ingredients",
    )
    .eq("id", id)
    .maybeSingle();
  const submission = found.data as unknown as SubmissionExtractionRow | null;
  if (found.error || !submission) {
    return NextResponse.json(fail("NOT_FOUND", "Submission not found.", { id: reqId }), {
      status: 404,
    });
  }

  const pasted = body.data.pastedText;
  let extraction: IngredientExtraction;
  let provider = "pasted-text";
  let model: string | null = null;

  if (pasted) {
    extraction = pastedExtraction(pasted);
  } else {
    if (!isPhotoExtractionEnabled() || env.AI_EXTRACTION_KILL_SWITCH) {
      return NextResponse.json(
        fail(
          "PHOTO_EXTRACTION_DISABLED",
          "Photo transcription is off. Paste the ingredient list instead.",
          { id: reqId },
        ),
        { status: 404 },
      );
    }
    if (submission.status === "NEEDS_CONFIRMATION") {
      const existing = IngredientExtractionSchema.safeParse(
        submission.extracted_ingredients,
      );
      if (existing.success) {
        return NextResponse.json(
          ok({ submissionId: id, extraction: existing.data, idempotent: true }, reqId),
        );
      }
    }
    if (
      submission.status !== "SANITIZED" ||
      !submission.sanitized_object_path ||
      !submission.sanitized_sha256 ||
      submission.sanitized_media_type !== "image/jpeg"
    ) {
      return NextResponse.json(
        fail("SUBMISSION_STATE", "This photo is not ready for transcription.", {
          id: reqId,
        }),
        { status: 409 },
      );
    }
    const sanitizedSha256 = submission.sanitized_sha256;
    const providers = createExtractionProviders();
    if (providers.length === 0) {
      return NextResponse.json(
        fail(
          "AI_NOT_CONFIGURED",
          "Photo transcription is unavailable. Paste the ingredient list instead.",
          { retryable: true, id: reqId },
        ),
        { status: 503 },
      );
    }
    const image = await admin.storage
      .from("submission-sanitized")
      .download(submission.sanitized_object_path);
    if (image.error || !image.data) {
      return NextResponse.json(
        fail("SANITIZED_IMAGE_UNAVAILABLE", "The safe photo copy could not be read.", {
          id: reqId,
        }),
        { status: 503 },
      );
    }
    const result = await orchestrateExtraction({
      input: {
        bytes: Buffer.from(await image.data.arrayBuffer()),
        mediaType: "image/jpeg",
        sanitizedSha256,
        submissionId: id,
      },
      providers,
      budget: {
        claim: async () => {
          const claimed = await admin.rpc("claim_ai_extraction_slot", {
            p_limit: env.EXTRACTION_DAILY_LIMIT,
          });
          return !claimed.error && claimed.data === true;
        },
      },
      enabled: true,
      promptVersion: EXTRACTION_PROMPT_VERSION,
      confidenceThreshold: env.EXTRACTION_CONFIDENCE_THRESHOLD,
      timeoutMs: env.AI_PROVIDER_TIMEOUT_MS,
    });
    await admin.from("extraction_attempts").upsert(
      result.attempts.map((attempt, index) => ({
        submission_id: id,
        sanitized_sha256: sanitizedSha256,
        attempt_ordinal: index + 1,
        provider: attempt.provider,
        model: attempt.model,
        prompt_version: attempt.promptVersion,
        outcome: attempt.outcome,
        failure_code: attempt.failureCode ?? null,
        latency_ms: attempt.latencyMs,
        input_tokens: attempt.usage?.inputTokens ?? null,
        output_tokens: attempt.usage?.outputTokens ?? null,
        estimated_cost_usd: attempt.usage?.estimatedCostUsd ?? null,
        extraction_json:
          result.ok && index === result.attempts.length - 1 ? result.extraction : null,
      })),
      { onConflict: "submission_id,attempt_ordinal" },
    );
    if (!result.ok) {
      await admin
        .from("submissions")
        .update({
          failure_code: result.code,
          failure_detail_safe: "Photo transcription did not produce confirmable text.",
        })
        .eq("id", id);
      return NextResponse.json(
        fail(
          result.code,
          "The photo could not be transcribed confidently. Retake it or paste the ingredient list.",
          { retryable: true, id: reqId },
        ),
        { status: 422 },
      );
    }
    extraction = result.extraction;
    const accepted = result.attempts[result.attempts.length - 1];
    provider = accepted?.provider ?? "unknown";
    model = accepted?.model ?? null;
  }

  const updated = await admin
    .from("submissions")
    .update({
      status: "NEEDS_CONFIRMATION",
      extracted_raw_text: extraction.rawText,
      extracted_ingredients: extraction,
      extraction_confidence: extraction.overallConfidence,
      extraction_provider: provider,
      extraction_model: model,
      prompt_version:
        provider === "pasted-text" ? "pasted-v1" : EXTRACTION_PROMPT_VERSION,
      failure_code: null,
      failure_detail_safe: null,
    })
    .eq("id", id)
    .in("status", ["UPLOAD_PENDING", "SANITIZED"])
    .select("id")
    .maybeSingle();
  if (updated.error || !updated.data) {
    return NextResponse.json(
      fail("SUBMISSION_STATE", "This submission cannot accept ingredient text.", {
        id: reqId,
      }),
      { status: 409 },
    );
  }
  return NextResponse.json(
    ok({ submissionId: id, extraction, requiresConfirmation: true }, reqId),
  );
}
