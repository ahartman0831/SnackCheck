import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@snackcheck/db-types";
import { z } from "zod";
import {
  EvidenceComparisonInputSchema,
  type EvidenceComparisonInput,
} from "../lib/catalog-evidence/ai-comparison-contracts";
import { orchestrateEvidenceComparison } from "../lib/catalog-evidence/ai-comparison-orchestrator";
import {
  AI_COMPARISON_STAGING_CONFIRMATION,
  createAiComparisonRunStore,
  type AiComparisonRpcClient,
} from "../lib/catalog-evidence/ai-comparison-persistence";
import { OpenAiEvidenceComparisonProvider } from "../lib/catalog-evidence/openai-comparison-provider";
import { assertStagingApplySafety } from "../lib/catalog-candidates/operation-safety";

const MAX_CANDIDATES = 5;
const DEFAULT_TIMEOUT_MS = 30_000;

const SnapshotSchema = z.object({
  productName: z.string().trim().max(500).nullable(),
  brand: z.string().trim().max(500).nullable(),
  gtins: z.array(z.string().regex(/^\d{8,14}$/)).max(10),
  quantity: z.string().trim().max(500).nullable(),
  ingredientText: z.string().trim().max(10_000).nullable(),
});

type CandidateRow = Pick<
  Database["public"]["Tables"]["catalog_source_records"]["Row"],
  | "id"
  | "brand"
  | "product_name"
  | "variant"
  | "size"
  | "normalized_gtin14"
  | "raw_ingredient_text"
>;

type EvidenceRow = Pick<
  Database["public"]["Tables"]["catalog_evidence_attempts"]["Row"],
  | "id"
  | "candidate_id"
  | "source_kind"
  | "source_url"
  | "observed_at"
  | "retrieved_at"
  | "ingredient_text"
  | "evidence_text"
>;

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function requiredOption(argv: string[], name: string): string {
  const value = option(argv, name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function uuid(value: string, name: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value,
    )
  ) {
    throw new Error(`${name} must be a lowercase UUID.`);
  }
  return value;
}

function settingValue(rows: { key: string; value: Json }[], key: string): Json {
  const row = rows.find((candidate) => candidate.key === key);
  if (!row) throw new Error(`Required setting ${key} is missing.`);
  return row.value;
}

function comparisonInput(
  candidate: CandidateRow,
  evidence: EvidenceRow,
): EvidenceComparisonInput {
  if (
    evidence.source_kind !== "MANUFACTURER" ||
    !evidence.source_url ||
    !evidence.ingredient_text ||
    !evidence.evidence_text
  ) {
    throw new Error(`Candidate ${candidate.id} lacks manufacturer ingredient evidence.`);
  }
  const snapshot = SnapshotSchema.parse(JSON.parse(evidence.evidence_text));
  return EvidenceComparisonInputSchema.parse({
    candidate: {
      id: candidate.id,
      gtin14: candidate.normalized_gtin14,
      brand: candidate.brand,
      productName: candidate.product_name,
      variant: candidate.variant,
      size: candidate.size,
      ingredientText: candidate.raw_ingredient_text,
    },
    evidence: [
      {
        sourceKind: "MANUFACTURER",
        sourceUrl: evidence.source_url,
        observedAt: evidence.observed_at ?? evidence.retrieved_at,
        productName: snapshot.productName,
        brand: snapshot.brand,
        gtins: snapshot.gtins,
        quantity: snapshot.quantity,
        ingredientText: evidence.ingredient_text,
      },
    ],
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const evidenceRunId = uuid(
    requiredOption(argv, "--evidence-run-id"),
    "--evidence-run-id",
  );
  const runId = uuid(requiredOption(argv, "--run-id"), "--run-id");
  const model = requiredOption(argv, "--model");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Staging Supabase credentials are required.");
  if (apply) {
    assertStagingApplySafety({
      argv,
      confirmation: AI_COMPARISON_STAGING_CONFIRMATION,
      url,
    });
  }

  const admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  const evidenceResult = await admin
    .from("catalog_evidence_attempts")
    .select(
      "id,candidate_id,source_kind,source_url,observed_at,retrieved_at,ingredient_text,evidence_text",
    )
    .eq("run_id", evidenceRunId)
    .eq("outcome", "EVIDENCE_FOUND")
    .eq("source_kind", "MANUFACTURER")
    .order("created_at", { ascending: true });
  if (evidenceResult.error) throw new Error(evidenceResult.error.message);
  const evidenceRows = (evidenceResult.data ?? []) as EvidenceRow[];
  if (evidenceRows.length < 1 || evidenceRows.length > MAX_CANDIDATES) {
    throw new Error("AI pilot requires 1–5 manufacturer evidence records.");
  }
  if (
    new Set(evidenceRows.map(({ candidate_id }) => candidate_id)).size !==
    evidenceRows.length
  ) {
    throw new Error("AI pilot evidence candidates must be unique.");
  }

  const candidateResult = await admin
    .from("catalog_source_records")
    .select("id,brand,product_name,variant,size,normalized_gtin14,raw_ingredient_text")
    .in(
      "id",
      evidenceRows.map(({ candidate_id }) => candidate_id),
    )
    .eq("candidate_state", "REVIEW_QUEUED")
    .eq("screen_status", "PASS")
    .eq("catalog_automation_route", "AUTO_EVIDENCE")
    .eq("discontinued", false);
  if (candidateResult.error) throw new Error(candidateResult.error.message);
  const candidates = new Map(
    ((candidateResult.data ?? []) as CandidateRow[]).map((candidate) => [
      candidate.id,
      candidate,
    ]),
  );
  if (candidates.size !== evidenceRows.length) {
    throw new Error("Every AI pilot candidate must remain eligible.");
  }

  const planned = evidenceRows.map((evidence) => {
    const candidate = candidates.get(evidence.candidate_id);
    if (!candidate) throw new Error("AI pilot candidate was not found.");
    return {
      candidate,
      evidence,
      input: comparisonInput(candidate, evidence),
    };
  });

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "DRY_RUN",
          runId,
          evidenceRunId,
          provider: "openai",
          model,
          plannedCandidates: planned.map(({ candidate, evidence }) => ({
            candidateId: candidate.id,
            evidenceAttemptId: evidence.id,
            sourceHost: new URL(evidence.source_url!).hostname,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required in apply mode.");
  const pricingResult = await admin
    .from("ai_model_pricing")
    .select("id")
    .eq("provider", "openai")
    .eq("model", model)
    .lte("effective_from", new Date().toISOString())
    .or(`effective_until.is.null,effective_until.gt.${new Date().toISOString()}`)
    .limit(1);
  if (pricingResult.error) throw new Error(pricingResult.error.message);
  if (!pricingResult.data?.length)
    throw new Error("The selected model has no active verified rate card.");

  const settingsResult = await admin
    .from("application_settings")
    .select("key,value")
    .in("key", ["catalog_evidence_ai_kill_switch", "catalog_evidence_ai_daily_limit"]);
  if (settingsResult.error) throw new Error(settingsResult.error.message);
  const settings = settingsResult.data ?? [];
  if (settingValue(settings, "catalog_evidence_ai_kill_switch") !== false) {
    throw new Error(
      "Catalog evidence AI kill switch must be explicitly opened for the pilot.",
    );
  }
  if (settingValue(settings, "catalog_evidence_ai_daily_limit") !== MAX_CANDIDATES) {
    throw new Error("Catalog evidence AI daily limit must equal five for the pilot.");
  }

  const store = createAiComparisonRunStore(admin as unknown as AiComparisonRpcClient);
  await store.begin({
    runId,
    provider: "openai",
    model,
    candidates: planned.map(({ candidate, evidence }) => ({
      candidateId: candidate.id,
      evidenceAttemptId: evidence.id,
    })),
    confirmation: AI_COMPARISON_STAGING_CONFIRMATION,
  });
  const provider = new OpenAiEvidenceComparisonProvider(model, apiKey);
  const outcomes: Record<string, unknown>[] = [];
  try {
    for (const { candidate, evidence, input } of planned) {
      const result = await orchestrateEvidenceComparison({
        input,
        provider,
        budget: { claim: () => store.claim(runId, candidate.id) },
        enabled: true,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      });
      if (!result.attempt) {
        throw new Error(`No AI call slot was available for candidate ${candidate.id}.`);
      }
      await store.record({
        runId,
        candidateId: candidate.id,
        evidenceAttemptId: evidence.id,
        result,
      });
      outcomes.push({
        candidateId: candidate.id,
        evidenceAttemptId: evidence.id,
        ok: result.ok,
        advisoryRoute: result.advisoryRoute,
        deterministicConflict: result.ok ? result.deterministicConflict : true,
        identity: result.ok ? result.comparison.identity : null,
        ingredientAgreement: result.ok ? result.comparison.ingredientAgreement : null,
        discrepancyCodes: result.ok ? result.comparison.discrepancyCodes : [],
        confidence: result.ok ? result.comparison.confidence : null,
        outcome: result.attempt.outcome,
        inputTokens: result.attempt.usage?.inputTokens ?? null,
        cachedInputTokens: result.attempt.usage?.cachedInputTokens ?? null,
        outputTokens: result.attempt.usage?.outputTokens ?? null,
        reasoningTokens: result.attempt.usage?.reasoningTokens ?? null,
      });
    }
    await store.complete(runId, "COMPLETED");
  } catch (error) {
    await store.complete(runId, "FAILED").catch(() => undefined);
    throw error;
  }

  console.log(
    JSON.stringify(
      {
        mode: "APPLY",
        runId,
        evidenceRunId,
        provider: "openai",
        model,
        attemptedCandidates: outcomes.length,
        outcomes,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "AI evidence comparison failed.",
  );
  process.exit(1);
});
