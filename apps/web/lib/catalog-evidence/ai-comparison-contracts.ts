import { z } from "zod";
import type { ProviderUsage } from "@/lib/ai/contracts";

export const CATALOG_EVIDENCE_COMPARISON_PROMPT_VERSION = "catalog-evidence-compare-v1";

export const EvidenceComparisonDiscrepancySchema = z.enum([
  "GTIN_MISMATCH",
  "BRAND_MISMATCH",
  "PRODUCT_NAME_MISMATCH",
  "VARIANT_MISMATCH",
  "PACKAGE_SIZE_MISMATCH",
  "INGREDIENTS_ADDED",
  "INGREDIENTS_REMOVED",
  "INGREDIENTS_REORDERED_OR_REFORMATTED",
  "SOURCE_MISSING_INGREDIENTS",
  "SOURCE_IDENTITY_INCOMPLETE",
  "POSSIBLE_FORMULATION_CHANGE",
]);

export const EvidenceComparisonOutputSchema = z.object({
  identity: z.enum(["MATCH", "POSSIBLE_MISMATCH", "MISMATCH", "INSUFFICIENT_EVIDENCE"]),
  ingredientAgreement: z.enum([
    "EXACT",
    "FORMATTING_ONLY",
    "MATERIAL_DIFFERENCE",
    "MISSING_EVIDENCE",
    "UNCERTAIN",
  ]),
  discrepancyCodes: z.array(EvidenceComparisonDiscrepancySchema).max(12),
  confidence: z.number().min(0).max(1),
  recommendedRoute: z.enum(["CONTINUE_DETERMINISTIC", "HUMAN_EXCEPTION"]),
});

export type EvidenceComparisonOutput = z.infer<typeof EvidenceComparisonOutputSchema>;

export const EvidenceComparisonInputSchema = z.object({
  candidate: z.object({
    id: z.string().uuid(),
    gtin14: z.string().regex(/^\d{14}$/),
    brand: z.string().trim().min(1).max(500),
    productName: z.string().trim().min(1).max(500),
    variant: z.string().trim().max(500).nullable(),
    size: z.string().trim().max(500).nullable(),
    ingredientText: z.string().trim().min(1).max(10_000),
  }),
  evidence: z
    .array(
      z.object({
        sourceKind: z.enum(["MANUFACTURER", "SECONDARY", "PACKAGE"]),
        sourceUrl: z.string().url(),
        observedAt: z.string().datetime({ offset: true }).nullable(),
        productName: z.string().trim().max(500).nullable(),
        brand: z.string().trim().max(500).nullable(),
        gtins: z.array(z.string().regex(/^\d{8,14}$/)).max(10),
        quantity: z.string().trim().max(500).nullable(),
        ingredientText: z.string().trim().max(10_000).nullable(),
      }),
    )
    .min(1)
    .max(4),
});

export type EvidenceComparisonInput = z.infer<typeof EvidenceComparisonInputSchema>;

export interface EvidenceComparisonProviderResponse {
  outputText: string;
  usage?: ProviderUsage;
}

export interface EvidenceComparisonProvider {
  readonly name: "openai" | "gemini" | "fixture";
  readonly model: string;
  compare(
    input: EvidenceComparisonInput,
    signal: AbortSignal,
  ): Promise<EvidenceComparisonProviderResponse>;
}

export type EvidenceComparisonFailureCode =
  | "KILL_SWITCH"
  | "BUDGET_EXHAUSTED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "OUTPUT_TOO_LARGE"
  | "OUTPUT_NOT_JSON"
  | "OUTPUT_SCHEMA_INVALID"
  | "COMPLIANCE_OUTPUT_FORBIDDEN";

export type EvidenceComparisonAttempt = {
  provider: EvidenceComparisonProvider["name"];
  model: string;
  promptVersion: typeof CATALOG_EVIDENCE_COMPARISON_PROMPT_VERSION;
  latencyMs: number;
  outcome: "ACCEPTED" | "ROUTED_TO_HUMAN" | "INVALID" | "ERROR" | "TIMEOUT";
  failureCode?: EvidenceComparisonFailureCode;
  usage?: ProviderUsage;
};
