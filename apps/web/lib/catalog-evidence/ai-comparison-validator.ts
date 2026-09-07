import {
  EvidenceComparisonOutputSchema,
  type EvidenceComparisonFailureCode,
  type EvidenceComparisonOutput,
} from "./ai-comparison-contracts";

const MAX_OUTPUT_BYTES = 8_000;
const FORBIDDEN_KEYS = new Set([
  "approval",
  "approved",
  "compliance",
  "complianceStatus",
  "determination",
  "eligibility",
  "passFail",
  "schoolCompliance",
]);

export class EvidenceComparisonOutputError extends Error {
  constructor(
    readonly code: EvidenceComparisonFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "EvidenceComparisonOutputError";
  }
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) => FORBIDDEN_KEYS.has(key) || containsForbiddenKey(child),
  );
}

export function parseEvidenceComparisonOutput(
  outputText: string,
): EvidenceComparisonOutput {
  if (Buffer.byteLength(outputText, "utf8") > MAX_OUTPUT_BYTES) {
    throw new EvidenceComparisonOutputError(
      "OUTPUT_TOO_LARGE",
      "AI output was oversized.",
    );
  }
  const trimmed = outputText.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new EvidenceComparisonOutputError(
      "OUTPUT_NOT_JSON",
      "AI output was not a single JSON object.",
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    throw new EvidenceComparisonOutputError(
      "OUTPUT_NOT_JSON",
      "AI output was invalid JSON.",
    );
  }
  if (containsForbiddenKey(value)) {
    throw new EvidenceComparisonOutputError(
      "COMPLIANCE_OUTPUT_FORBIDDEN",
      "AI output attempted to make a prohibited product determination.",
    );
  }
  const parsed = EvidenceComparisonOutputSchema.safeParse(value);
  if (!parsed.success) {
    throw new EvidenceComparisonOutputError(
      "OUTPUT_SCHEMA_INVALID",
      "AI output did not match the comparison contract.",
    );
  }
  return parsed.data;
}
