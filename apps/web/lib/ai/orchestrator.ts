import type { IngredientExtraction } from "@snackcheck/contracts";
import type {
  ExtractionAttempt,
  ExtractionBudgetGate,
  ExtractionImageInput,
  ExtractionOrchestrationResult,
  ExtractionProvider,
} from "./contracts";
import { ExtractionOutputError, parseProviderOutput } from "./output-validator";
import {
  ExtractionExecutionError,
  type ExtractionExecutionPolicy,
} from "./execution-policy";

const SEVERE_WARNINGS = new Set([
  "NO_INGREDIENT_PANEL",
  "UNREADABLE_TEXT",
  "LANGUAGE_UNSUPPORTED",
]);

function needsEscalation(value: IngredientExtraction, threshold: number): boolean {
  return (
    !value.panelFound ||
    value.overallConfidence < threshold ||
    value.warnings.some((warning) => SEVERE_WARNINGS.has(warning)) ||
    value.ingredientText.trim().length === 0
  );
}

function conflicts(left: IngredientExtraction, right: IngredientExtraction): boolean {
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
  return normalize(left.ingredientText) !== normalize(right.ingredientText);
}

export async function orchestrateExtraction(options: {
  input: ExtractionImageInput;
  providers: ExtractionProvider[];
  budget: ExtractionBudgetGate;
  enabled: boolean;
  promptVersion: string;
  confidenceThreshold: number;
  timeoutMs: number;
  maxCalls?: number;
  retryBaseDelayMs?: number;
  executionPolicy?: ExtractionExecutionPolicy;
}): Promise<ExtractionOrchestrationResult> {
  const attempts: ExtractionAttempt[] = [];
  if (!options.enabled) return { ok: false, code: "KILL_SWITCH", attempts };
  if (!(await options.budget.claim())) {
    return { ok: false, code: "BUDGET_EXHAUSTED", attempts };
  }

  let candidate: IngredientExtraction | null = null;
  const maxCalls = Math.min(options.maxCalls ?? 3, 3);
  let callCount = 0;
  const wait = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));
  const providers = options.providers.slice(0, 3);
  for (const provider of providers) {
    let retryAvailable = true;
    while (callCount < maxCalls) {
      callCount += 1;
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      let shouldRetry = false;
      try {
        const operation = () => provider.extract(options.input, controller.signal);
        const response = options.executionPolicy
          ? await options.executionPolicy.run(
              `${provider.name}:${provider.model}`,
              operation,
            )
          : await operation();
        const extraction = parseProviderOutput(response.outputText);
        const lowConfidence = needsEscalation(extraction, options.confidenceThreshold);
        attempts.push({
          provider: provider.name,
          model: provider.model,
          promptVersion: options.promptVersion,
          latencyMs: Date.now() - started,
          usage: response.usage,
          outcome: lowConfidence ? "LOW_CONFIDENCE" : "ACCEPTED",
          failureCode: lowConfidence
            ? extraction.panelFound
              ? "LOW_CONFIDENCE"
              : "NO_PANEL"
            : undefined,
        });
        if (candidate && conflicts(candidate, extraction)) {
          return { ok: false, code: "PROVIDER_CONFLICT", attempts };
        }
        candidate = extraction;
        if (!lowConfidence) {
          return {
            ok: true,
            extraction,
            attempts,
            requiresConfirmation: true,
            quality: "ACCEPTED",
          };
        }
        break;
      } catch (error) {
        const timedOut = controller.signal.aborted;
        const code = timedOut
          ? "PROVIDER_TIMEOUT"
          : error instanceof ExtractionExecutionError
            ? error.code
            : error instanceof ExtractionOutputError
              ? error.code
              : "PROVIDER_ERROR";
        attempts.push({
          provider: provider.name,
          model: provider.model,
          promptVersion: options.promptVersion,
          latencyMs: Date.now() - started,
          outcome: timedOut
            ? "TIMEOUT"
            : error instanceof ExtractionOutputError
              ? "INVALID"
              : "ERROR",
          failureCode: code,
        });
        shouldRetry =
          retryAvailable &&
          (code === "PROVIDER_TIMEOUT" || code === "PROVIDER_ERROR") &&
          callCount < maxCalls;
      } finally {
        clearTimeout(timer);
      }
      if (!shouldRetry) break;
      retryAvailable = false;
      const baseDelay = options.retryBaseDelayMs ?? 80;
      const jitteredDelay = Math.max(0, Math.round(baseDelay * (0.5 + Math.random())));
      await wait(jitteredDelay);
    }
    if (callCount >= maxCalls) break;
  }
  if (candidate?.panelFound) {
    return {
      ok: true,
      extraction: candidate,
      attempts,
      requiresConfirmation: true,
      quality: "LOW_CONFIDENCE",
    };
  }
  return { ok: false, code: candidate ? "NO_PANEL" : "ALL_PROVIDERS_FAILED", attempts };
}
