import type { IngredientExtraction } from "@snackcheck/contracts";

export type ExtractionProviderName = "gemini" | "openai" | "fixture";

export interface ExtractionImageInput {
  bytes: Buffer;
  mediaType: "image/jpeg";
  sanitizedSha256: string;
  submissionId: string;
}

export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export interface ProviderResponse {
  outputText: string;
  usage?: ProviderUsage;
}

export interface ExtractionProvider {
  readonly name: ExtractionProviderName;
  readonly model: string;
  extract(input: ExtractionImageInput, signal: AbortSignal): Promise<ProviderResponse>;
}

export interface ExtractionAttempt {
  provider: ExtractionProviderName;
  model: string;
  promptVersion: string;
  latencyMs: number;
  usage?: ProviderUsage;
  outcome: "ACCEPTED" | "LOW_CONFIDENCE" | "INVALID" | "ERROR" | "TIMEOUT";
  failureCode?: ExtractionFailureCode;
}

export type ExtractionFailureCode =
  | "KILL_SWITCH"
  | "BUDGET_EXHAUSTED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "OUTPUT_TOO_LARGE"
  | "OUTPUT_NOT_JSON"
  | "OUTPUT_SCHEMA_INVALID"
  | "COMPLIANCE_OUTPUT_FORBIDDEN"
  | "LOW_CONFIDENCE"
  | "NO_PANEL"
  | "PROVIDER_CONFLICT"
  | "ALL_PROVIDERS_FAILED";

export type ExtractionOrchestrationResult =
  | {
      ok: true;
      extraction: IngredientExtraction;
      attempts: ExtractionAttempt[];
      requiresConfirmation: true;
      quality: "ACCEPTED" | "LOW_CONFIDENCE";
    }
  | {
      ok: false;
      code: ExtractionFailureCode;
      attempts: ExtractionAttempt[];
    };

export interface ExtractionBudgetGate {
  claim(): Promise<boolean>;
}
