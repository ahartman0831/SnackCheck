import { IngredientExtractionSchema } from "@snackcheck/contracts";
import type { IngredientExtraction } from "@snackcheck/contracts";
import type { ExtractionFailureCode } from "./contracts";

const MAX_PROVIDER_OUTPUT_BYTES = 32_000;
const FORBIDDEN_KEYS = new Set([
  "compliance",
  "complianceStatus",
  "determination",
  "passFail",
  "schoolCompliance",
]);

export class ExtractionOutputError extends Error {
  constructor(
    readonly code: ExtractionFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtractionOutputError";
  }
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) => FORBIDDEN_KEYS.has(key) || containsForbiddenKey(child),
  );
}

export function parseProviderOutput(outputText: string): IngredientExtraction {
  if (Buffer.byteLength(outputText, "utf8") > MAX_PROVIDER_OUTPUT_BYTES) {
    throw new ExtractionOutputError("OUTPUT_TOO_LARGE", "Provider output was oversized");
  }
  const trimmed = outputText.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new ExtractionOutputError(
      "OUTPUT_NOT_JSON",
      "Provider returned prose or truncated JSON",
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    throw new ExtractionOutputError("OUTPUT_NOT_JSON", "Provider returned invalid JSON");
  }
  if (containsForbiddenKey(value)) {
    throw new ExtractionOutputError(
      "COMPLIANCE_OUTPUT_FORBIDDEN",
      "Provider attempted to return a compliance field",
    );
  }
  const parsed = IngredientExtractionSchema.safeParse(value);
  if (!parsed.success) {
    throw new ExtractionOutputError(
      "OUTPUT_SCHEMA_INVALID",
      "Provider output did not match the extraction contract",
    );
  }
  return parsed.data;
}
