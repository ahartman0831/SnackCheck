import { z } from "zod";

export const IngredientStatusSchema = z.enum(["PASS", "FAIL", "VERIFY"]);
export type IngredientStatus = z.infer<typeof IngredientStatusSchema>;

export const ApplicabilityStatusSchema = z.enum([
  "APPLIES",
  "PARENT_OWN_CHILD_EXCEPTION",
  "OUTSIDE_NORMAL_SCHOOL_DAY",
  "SCHOOL_NOT_CONFIRMED_PARTICIPATING",
  "UNKNOWN",
]);
export type ApplicabilityStatus = z.infer<typeof ApplicabilityStatusSchema>;

export const LocalPolicyStatusSchema = z.enum([
  "ALLOWED_BY_VERIFIED_POLICY",
  "RESTRICTED_BY_VERIFIED_POLICY",
  "NO_VERIFIED_POLICY",
  "NOT_REQUESTED",
]);
export type LocalPolicyStatus = z.infer<typeof LocalPolicyStatusSchema>;

export const EvaluationContextSchema = z.enum([
  "CLASSROOM_DISTRIBUTION",
  "SCHOOL_SERVED",
  "SCHOOL_SOLD",
  "THIRD_PARTY_SOLD",
  "FUNDRAISER_DURING_SCHOOL_DAY",
  "PARENT_OWN_CHILD",
  "UNKNOWN",
]);
export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

export const VerificationStatusSchema = z.enum([
  "VERIFIED",
  "PACKAGE_VERIFIED",
  "EXTERNAL_DATABASE",
  "COMMUNITY_SUBMITTED",
  "STALE",
  "CONFLICT",
  "REJECTED",
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const MatchModeSchema = z.enum([
  "EXACT_SEGMENT",
  "TOKEN_SEQUENCE",
  "REVIEWED_REGEX",
]);
export type MatchMode = z.infer<typeof MatchModeSchema>;

export const SourceTypeSchema = z.enum([
  "STATUTE",
  "AGENCY_GUIDANCE",
  "MANUFACTURER",
  "PACKAGE_PHOTO",
  "EXTERNAL_DATABASE",
  "COMMUNITY_SUBMISSION",
  "ADMIN_ENTRY",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const AliasReviewStatusSchema = z.enum([
  "EXACT_STATUTE_TERM",
  "AUTHORITATIVE_SYNONYM",
  "EXPERT_VERIFIED",
  "PENDING_REVIEW",
  "REJECTED",
]);
export type AliasReviewStatus = z.infer<typeof AliasReviewStatusSchema>;

export const SubmissionStatusSchema = z.enum([
  "UPLOAD_PENDING",
  "UPLOADED",
  "PROCESSING",
  "NEEDS_CONFIRMATION",
  "CONFIRMED",
  "EVALUATED",
  "REVIEW_PENDING",
  "APPROVED",
  "REJECTED",
  "FAILED",
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const AdminRoleSchema = z.enum(["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"]);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const INGREDIENT_STATUS_LABELS: Record<IngredientStatus, string> = {
  PASS: "No listed restriction found",
  FAIL: "Potential listed restriction found",
  VERIFY: "Needs verification",
};

export const LOCAL_RULES_DISCLAIMER =
  "Verify with your school or governing authority before deciding what to bring. Schools may have additional food, allergy, packaging, or celebration rules. A screening result is not school approval or a legal-compliance decision.";

export const PARENT_OWN_CHILD_DISCLAIMER =
  "Arizona's school-day restriction does not prevent a parent or guardian from providing this food to their own student. Your school may still have other policies, including allergy or campus rules.";
