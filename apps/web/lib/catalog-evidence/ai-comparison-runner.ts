import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@snackcheck/db-types";
import { z } from "zod";
import {
  EvidenceComparisonInputSchema,
  type EvidenceComparisonInput,
} from "./ai-comparison-contracts";
import { orchestrateEvidenceComparison } from "./ai-comparison-orchestrator";
import {
  AI_COMPARISON_STAGING_CONFIRMATION,
  createAiComparisonRunStore,
  type AiComparisonRpcClient,
} from "./ai-comparison-persistence";
import { OpenAiEvidenceComparisonProvider } from "./openai-comparison-provider";
import { isPlausibleIngredientStatement } from "./manufacturer-page";

export const CATALOG_AI_MAX_CANDIDATES = 5;
export const CATALOG_AI_EXPECTED_DAILY_LIMIT = 50;
export const CATALOG_AI_EXPECTED_HOURLY_LIMIT = 15;
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

type DossierRow = Pick<
  Database["public"]["Tables"]["catalog_evidence_dossiers"]["Row"],
  "id" | "candidate_id" | "created_at"
>;

type DossierItemRow = Pick<
  Database["public"]["Tables"]["catalog_evidence_dossier_items"]["Row"],
  "dossier_id" | "evidence_attempt_id" | "evidence_role" | "ordinal"
>;

export type PlannedCatalogAiComparison = {
  candidate: CandidateRow;
  dossierId: string;
  evidence: EvidenceRow;
  input: EvidenceComparisonInput;
};

export type CatalogAiComparisonOutcome = {
  candidateId: string;
  evidenceAttemptId: string;
  ok: boolean;
  advisoryRoute: "CONTINUE_DETERMINISTIC" | "HUMAN_EXCEPTION";
  deterministicConflict: boolean;
  identity: string | null;
  ingredientAgreement: string | null;
  discrepancyCodes: string[];
  confidence: number | null;
  outcome: string;
  failureCode: string | null;
  reservationReleased: boolean;
  circuitOpened: boolean;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
};

function settingValue(rows: { key: string; value: Json }[], key: string): Json {
  const row = rows.find((candidate) => candidate.key === key);
  if (!row) throw new Error(`Required setting ${key} is missing.`);
  return row.value;
}

function comparisonInput(
  candidate: CandidateRow,
  evidenceRows: EvidenceRow[],
): EvidenceComparisonInput {
  if (
    !evidenceRows.some(
      (evidence) =>
        evidence.source_kind === "MANUFACTURER" &&
        isPlausibleIngredientStatement(evidence.ingredient_text),
    )
  ) {
    throw new Error(`Candidate ${candidate.id} lacks manufacturer ingredient evidence.`);
  }
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
    evidence: evidenceRows.map((evidence) => {
      if (!evidence.source_url || !evidence.evidence_text) {
        throw new Error(`Candidate ${candidate.id} has incomplete dossier evidence.`);
      }
      const snapshot = SnapshotSchema.parse(JSON.parse(evidence.evidence_text));
      return {
        sourceKind: evidence.source_kind,
        sourceUrl: evidence.source_url,
        observedAt: evidence.observed_at ?? evidence.retrieved_at,
        productName: snapshot.productName,
        brand: snapshot.brand,
        gtins: snapshot.gtins,
        quantity: snapshot.quantity,
        ingredientText: isPlausibleIngredientStatement(evidence.ingredient_text)
          ? evidence.ingredient_text
          : null,
      };
    }),
  });
}

export async function planCatalogAiComparisons(
  admin: SupabaseClient<Database>,
  candidateIds: string[],
): Promise<PlannedCatalogAiComparison[]> {
  if (
    candidateIds.length < 1 ||
    candidateIds.length > CATALOG_AI_MAX_CANDIDATES ||
    new Set(candidateIds).size !== candidateIds.length
  ) {
    throw new Error("Select between one and five unique catalog candidates.");
  }

  const dossierResult = await admin
    .from("catalog_evidence_dossiers")
    .select("id,candidate_id,created_at")
    .in("candidate_id", candidateIds)
    .order("created_at", { ascending: false });
  if (dossierResult.error) throw new Error(dossierResult.error.message);

  const dossierByCandidate = new Map<string, DossierRow>();
  for (const row of (dossierResult.data ?? []) as DossierRow[]) {
    if (!dossierByCandidate.has(row.candidate_id)) {
      dossierByCandidate.set(row.candidate_id, row);
    }
  }
  if (dossierByCandidate.size !== candidateIds.length) {
    throw new Error("Every selected candidate needs an evidence dossier.");
  }

  const dossierIds = [...dossierByCandidate.values()].map(({ id }) => id);
  const itemResult = await admin
    .from("catalog_evidence_dossier_items")
    .select("dossier_id,evidence_attempt_id,evidence_role,ordinal")
    .in("dossier_id", dossierIds)
    .order("ordinal", { ascending: true });
  if (itemResult.error) throw new Error(itemResult.error.message);
  const items = (itemResult.data ?? []) as DossierItemRow[];
  const evidenceIds = items.map(({ evidence_attempt_id }) => evidence_attempt_id);
  const evidenceResult = await admin
    .from("catalog_evidence_attempts")
    .select(
      "id,candidate_id,source_kind,source_url,observed_at,retrieved_at,ingredient_text,evidence_text",
    )
    .in("id", evidenceIds)
    .eq("outcome", "EVIDENCE_FOUND");
  if (evidenceResult.error) throw new Error(evidenceResult.error.message);
  const evidenceById = new Map(
    ((evidenceResult.data ?? []) as EvidenceRow[]).map((row) => [row.id, row]),
  );

  const candidateResult = await admin
    .from("catalog_source_records")
    .select("id,brand,product_name,variant,size,normalized_gtin14,raw_ingredient_text")
    .in("id", candidateIds)
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
  if (candidates.size !== candidateIds.length) {
    throw new Error("Every selected candidate must remain eligible for automation.");
  }

  return candidateIds.map((candidateId) => {
    const candidate = candidates.get(candidateId);
    const dossier = dossierByCandidate.get(candidateId);
    if (!candidate || !dossier) throw new Error("A selected candidate was not found.");
    const dossierItems = items.filter(({ dossier_id }) => dossier_id === dossier.id);
    const evidenceRows = dossierItems.map(({ evidence_attempt_id }) => {
      const row = evidenceById.get(evidence_attempt_id);
      if (!row) throw new Error(`Evidence dossier ${dossier.id} is incomplete.`);
      return row;
    });
    const primaryItem = dossierItems.find(
      ({ evidence_role }) => evidence_role === "INGREDIENTS",
    );
    const evidence = primaryItem
      ? evidenceById.get(primaryItem.evidence_attempt_id)
      : undefined;
    if (!evidence) throw new Error(`Evidence dossier ${dossier.id} lacks ingredients.`);
    return {
      candidate,
      dossierId: dossier.id,
      evidence,
      input: comparisonInput(candidate, evidenceRows),
    };
  });
}

export async function executeCatalogAiComparisons(input: {
  admin: SupabaseClient<Database>;
  runId: string;
  model: string;
  apiKey: string;
  planned: PlannedCatalogAiComparison[];
}): Promise<CatalogAiComparisonOutcome[]> {
  const { admin, runId, model, apiKey, planned } = input;
  const pricingResult = await admin
    .from("ai_model_pricing")
    .select("id")
    .eq("provider", "openai")
    .eq("model", model)
    .lte("effective_from", new Date().toISOString())
    .or(`effective_until.is.null,effective_until.gt.${new Date().toISOString()}`)
    .limit(1);
  if (pricingResult.error) throw new Error(pricingResult.error.message);
  if (!pricingResult.data?.length) {
    throw new Error("The selected model has no active verified rate card.");
  }

  const settingsResult = await admin
    .from("application_settings")
    .select("key,value")
    .in("key", [
      "catalog_evidence_ai_kill_switch",
      "catalog_evidence_ai_daily_limit",
      "catalog_evidence_ai_hourly_limit",
    ]);
  if (settingsResult.error) throw new Error(settingsResult.error.message);
  const settings = settingsResult.data ?? [];
  if (settingValue(settings, "catalog_evidence_ai_kill_switch") !== false) {
    throw new Error("Catalog evidence AI is currently paused by its safety switch.");
  }
  if (
    settingValue(settings, "catalog_evidence_ai_daily_limit") !==
    CATALOG_AI_EXPECTED_DAILY_LIMIT
  ) {
    throw new Error("Catalog evidence AI daily limit must equal 50.");
  }
  if (
    settingValue(settings, "catalog_evidence_ai_hourly_limit") !==
    CATALOG_AI_EXPECTED_HOURLY_LIMIT
  ) {
    throw new Error("Catalog evidence AI hourly limit must equal 15.");
  }

  const store = createAiComparisonRunStore(admin as unknown as AiComparisonRpcClient);
  await store.begin({
    runId,
    provider: "openai",
    model,
    candidates: planned.map(({ candidate, evidence, dossierId }) => ({
      candidateId: candidate.id,
      evidenceAttemptId: evidence.id,
      dossierId,
    })),
    confirmation: AI_COMPARISON_STAGING_CONFIRMATION,
  });
  const provider = new OpenAiEvidenceComparisonProvider(model, apiKey);
  const outcomes: CatalogAiComparisonOutcome[] = [];
  try {
    for (const { candidate, evidence, input: comparison } of planned) {
      const result = await orchestrateEvidenceComparison({
        input: comparison,
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
      const reservation = await store.reconcileReservation(runId, candidate.id);
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
        failureCode: result.ok ? null : result.code,
        reservationReleased: reservation.released,
        circuitOpened: reservation.circuitOpened,
        inputTokens: result.attempt.usage?.inputTokens ?? null,
        cachedInputTokens: result.attempt.usage?.cachedInputTokens ?? null,
        outputTokens: result.attempt.usage?.outputTokens ?? null,
        reasoningTokens: result.attempt.usage?.reasoningTokens ?? null,
      });
      if (
        !result.ok &&
        (result.code === "PROVIDER_AUTH" || result.code === "PROVIDER_REQUEST_INVALID")
      ) {
        throw new Error(`AI comparison stopped after a ${result.code} failure.`);
      }
    }
    await store.complete(runId, "COMPLETED");
  } catch (error) {
    await store.complete(runId, "FAILED").catch(() => undefined);
    throw error;
  }
  return outcomes;
}
