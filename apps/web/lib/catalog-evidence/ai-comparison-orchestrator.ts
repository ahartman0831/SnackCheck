import { normalizeIngredientText } from "@snackcheck/compliance";
import type { ExtractionBudgetGate } from "@/lib/ai/contracts";
import {
  CATALOG_EVIDENCE_COMPARISON_PROMPT_VERSION,
  EvidenceComparisonInputSchema,
  type EvidenceComparisonAttempt,
  type EvidenceComparisonFailureCode,
  type EvidenceComparisonInput,
  type EvidenceComparisonOutput,
  type EvidenceComparisonProvider,
} from "./ai-comparison-contracts";
import {
  EvidenceComparisonOutputError,
  parseEvidenceComparisonOutput,
} from "./ai-comparison-validator";

export type EvidenceComparisonResult =
  | {
      ok: true;
      comparison: EvidenceComparisonOutput;
      advisoryRoute: "CONTINUE_DETERMINISTIC" | "HUMAN_EXCEPTION";
      deterministicConflict: boolean;
      attempt: EvidenceComparisonAttempt;
    }
  | {
      ok: false;
      code: EvidenceComparisonFailureCode;
      advisoryRoute: "HUMAN_EXCEPTION";
      attempt: EvidenceComparisonAttempt | null;
    };

function ingredientConflict(input: EvidenceComparisonInput): boolean {
  const candidate = normalizeIngredientText(input.candidate.ingredientText);
  const evidenceIngredients = input.evidence
    .map(({ ingredientText }) => ingredientText?.trim() ?? "")
    .filter(Boolean)
    .map(normalizeIngredientText);
  return (
    evidenceIngredients.length === 0 ||
    evidenceIngredients.some((ingredients) => ingredients !== candidate)
  );
}

function mayContinue(comparison: EvidenceComparisonOutput): boolean {
  return (
    comparison.identity === "MATCH" &&
    (comparison.ingredientAgreement === "EXACT" ||
      comparison.ingredientAgreement === "FORMATTING_ONLY") &&
    comparison.discrepancyCodes.length === 0 &&
    comparison.confidence >= 0.95 &&
    comparison.recommendedRoute === "CONTINUE_DETERMINISTIC"
  );
}

export async function orchestrateEvidenceComparison(options: {
  input: EvidenceComparisonInput;
  provider: EvidenceComparisonProvider;
  budget: ExtractionBudgetGate;
  enabled: boolean;
  timeoutMs: number;
}): Promise<EvidenceComparisonResult> {
  const input = EvidenceComparisonInputSchema.parse(options.input);
  if (!options.enabled) {
    return {
      ok: false,
      code: "KILL_SWITCH",
      advisoryRoute: "HUMAN_EXCEPTION",
      attempt: null,
    };
  }
  if (!(await options.budget.claim())) {
    return {
      ok: false,
      code: "BUDGET_EXHAUSTED",
      advisoryRoute: "HUMAN_EXCEPTION",
      attempt: null,
    };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.provider.compare(input, controller.signal);
    const comparison = parseEvidenceComparisonOutput(response.outputText);
    const deterministicConflict = ingredientConflict(input);
    const advisoryRoute =
      !deterministicConflict && mayContinue(comparison)
        ? "CONTINUE_DETERMINISTIC"
        : "HUMAN_EXCEPTION";
    return {
      ok: true,
      comparison,
      advisoryRoute,
      deterministicConflict,
      attempt: {
        provider: options.provider.name,
        model: options.provider.model,
        promptVersion: CATALOG_EVIDENCE_COMPARISON_PROMPT_VERSION,
        latencyMs: Date.now() - started,
        outcome:
          advisoryRoute === "CONTINUE_DETERMINISTIC" ? "ACCEPTED" : "ROUTED_TO_HUMAN",
        usage: response.usage,
      },
    };
  } catch (error) {
    const code: EvidenceComparisonFailureCode = controller.signal.aborted
      ? "PROVIDER_TIMEOUT"
      : error instanceof EvidenceComparisonOutputError
        ? error.code
        : "PROVIDER_ERROR";
    return {
      ok: false,
      code,
      advisoryRoute: "HUMAN_EXCEPTION",
      attempt: {
        provider: options.provider.name,
        model: options.provider.model,
        promptVersion: CATALOG_EVIDENCE_COMPARISON_PROMPT_VERSION,
        latencyMs: Date.now() - started,
        outcome: controller.signal.aborted
          ? "TIMEOUT"
          : error instanceof EvidenceComparisonOutputError
            ? "INVALID"
            : "ERROR",
        failureCode: code,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
