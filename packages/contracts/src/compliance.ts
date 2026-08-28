import { z } from "zod";
import {
  ApplicabilityStatusSchema,
  EvaluationContextSchema,
  IngredientStatusSchema,
  LocalPolicyStatusSchema,
  MatchModeSchema,
  VerificationStatusSchema,
} from "./enums";

export const QualityFlagSchema = z.enum([
  "NO_FORMULATION",
  "INCOMPLETE_INGREDIENTS",
  "ACTIVE_CONFLICT",
  "UNCONFIRMED_EVIDENCE",
  "STALE_EVIDENCE",
  "LOW_CONFIDENCE",
  "LOW_SPAN_CONFIDENCE",
  "UNRESOLVED_PRODUCT_CANDIDATES",
  "RULESET_UNAVAILABLE",
  "PRECAUTIONARY_MATCH_ONLY",
  "AGING_EVIDENCE",
  "PARSER_WARNING",
]);
export type QualityFlag = z.infer<typeof QualityFlagSchema>;

export const ParsedIngredientSchema = z.object({
  ordinal: z.number().int().nonnegative(),
  raw: z.string(),
  normalized: z.string(),
  parentOrdinal: z.number().int().nonnegative().nullable(),
  startOffset: z.number().int().nonnegative().nullable(),
  endOffset: z.number().int().nonnegative().nullable(),
  presenceKind: z.enum(["DECLARED", "PRECAUTIONARY", "UNKNOWN"]),
  warnings: z.array(z.string()),
});
export type ParsedIngredient = z.infer<typeof ParsedIngredientSchema>;

export const EnabledAliasSchema = z.object({
  id: z.string(),
  alias: z.string(),
  normalizedAlias: z.string(),
  matchMode: MatchModeSchema,
  reviewStatus: z.enum([
    "EXACT_STATUTE_TERM",
    "AUTHORITATIVE_SYNONYM",
    "EXPERT_VERIFIED",
  ]),
  enabled: z.literal(true),
  regulatorySourceId: z.string().nullable(),
  pattern: z.string().optional(),
});
export type EnabledAlias = z.infer<typeof EnabledAliasSchema>;

export const ProhibitedSubstanceSnapshotSchema = z.object({
  id: z.string(),
  canonicalName: z.string(),
  canonicalNormalized: z.string(),
  statutoryOrdinal: z.number().int(),
  regulatorySourceId: z.string(),
  sourceLocator: z.string().nullable(),
  enabled: z.boolean(),
  aliases: z.array(EnabledAliasSchema),
});
export type ProhibitedSubstanceSnapshot = z.infer<
  typeof ProhibitedSubstanceSnapshotSchema
>;

export const RulesetContextSnapshotSchema = z.object({
  context: EvaluationContextSchema,
  applicabilityStatus: ApplicabilityStatusSchema,
  regulatorySourceId: z.string(),
  sourceLocator: z.string().nullable(),
  publicSummary: z.string(),
  enabled: z.boolean(),
});
export type RulesetContextSnapshot = z.infer<typeof RulesetContextSnapshotSchema>;

export const PublishedRulesetSnapshotSchema = z.object({
  id: z.string(),
  jurisdictionId: z.string(),
  code: z.string(),
  version: z.number().int(),
  title: z.string(),
  effectiveFrom: z.string(),
  effectiveUntil: z.string().nullable(),
  publishedAt: z.string().nullable(),
  isPublished: z.boolean(),
  rulesetHash: z.string(),
  freshnessCurrentDays: z.number().int(),
  freshnessAgingDays: z.number().int(),
  substances: z.array(ProhibitedSubstanceSnapshotSchema),
  contexts: z.array(RulesetContextSnapshotSchema),
  sourceIds: z.array(z.string()),
});
export type PublishedRulesetSnapshot = z.infer<typeof PublishedRulesetSnapshotSchema>;

export const FormulationInputSchema = z.object({
  id: z.string(),
  hash: z.string(),
  rawIngredients: z.string(),
  ingredients: z.array(ParsedIngredientSchema),
  verificationStatus: VerificationStatusSchema,
  confidence: z.number().min(0).max(1).nullable(),
  lastVerifiedAt: z.string().nullable(),
  conflict: z.boolean(),
});
export type FormulationInput = z.infer<typeof FormulationInputSchema>;

export const VerifiedSchoolContextSchema = z.object({
  schoolId: z.string(),
  participating: z.boolean().nullable(),
  participationVerifiedAt: z.string().nullable(),
  localPolicyStatus: LocalPolicyStatusSchema,
  localPolicySummary: z.string().nullable(),
});
export type VerifiedSchoolContext = z.infer<typeof VerifiedSchoolContextSchema>;

export const ComplianceInputSchema = z.object({
  formulation: FormulationInputSchema,
  ruleset: PublishedRulesetSnapshotSchema,
  context: EvaluationContextSchema,
  evaluationDate: z.string(),
  schoolContext: VerifiedSchoolContextSchema.optional(),
  parserWarnings: z.array(z.string()).optional(),
});
export type ComplianceInput = z.infer<typeof ComplianceInputSchema>;

export const ComplianceMatchSchema = z.object({
  substanceId: z.string(),
  canonicalName: z.string(),
  aliasId: z.string(),
  alias: z.string(),
  formulationIngredientOrdinal: z.number().int().nullable(),
  rawLabelValue: z.string(),
  normalizedLabelValue: z.string(),
  startOffset: z.number().int().nullable(),
  endOffset: z.number().int().nullable(),
  matchMode: MatchModeSchema,
  regulatorySourceId: z.string().nullable(),
  precautionary: z.boolean(),
});
export type ComplianceMatch = z.infer<typeof ComplianceMatchSchema>;

export const ComplianceExplanationSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  contextSummary: z.string(),
  localPolicySummary: z.string(),
});
export type ComplianceExplanation = z.infer<typeof ComplianceExplanationSchema>;

export const ComplianceResultSchema = z.object({
  ingredientStatus: IngredientStatusSchema,
  applicabilityStatus: ApplicabilityStatusSchema,
  localPolicyStatus: LocalPolicyStatusSchema,
  matchedRules: z.array(ComplianceMatchSchema),
  qualityFlags: z.array(QualityFlagSchema),
  rulesetHash: z.string(),
  formulationHash: z.string(),
  engineVersion: z.string(),
  evaluatedAt: z.string(),
  explanation: ComplianceExplanationSchema,
});
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;
