import { z } from "zod";
import { IngredientStatusSchema, VerificationStatusSchema } from "./enums";

export const FreshnessStateSchema = z.enum(["CURRENT", "AGING", "STALE", "UNKNOWN"]);
export type FreshnessState = z.infer<typeof FreshnessStateSchema>;

export const PublicProductCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  brand: z.string(),
  name: z.string(),
  variant: z.string().nullable(),
  size: z.string().nullable(),
  category: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageAttribution: z.string().nullable(),
  ingredientStatus: IngredientStatusSchema,
  verificationStatus: VerificationStatusSchema.nullable(),
  lastVerifiedAt: z.string().nullable(),
  freshnessState: FreshnessStateSchema,
  formulationConflict: z.boolean(),
  rulesetHash: z.string().nullable(),
  individuallyPackaged: z.boolean().nullable().optional(),
  evidenceTitle: z.string().nullable().optional(),
  evidenceUrl: z.string().url().nullable().optional(),
  evidenceObservedAt: z.string().nullable().optional(),
});
export type PublicProductCard = z.infer<typeof PublicProductCardSchema>;

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.number().int().min(1).max(24).default(24),
  offset: z.number().int().min(0).default(0),
  cursorId: z.string().uuid().optional(),
  cursorRank: z.number().int().optional(),
  cursorName: z.string().optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const APPROVED_VERIFICATION_STATUSES = ["VERIFIED", "PACKAGE_VERIFIED"] as const;

export const UNCONFIRMED_VERIFICATION_STATUSES = [
  "COMMUNITY_SUBMITTED",
  "EXTERNAL_DATABASE",
  "STALE",
  "CONFLICT",
  "REJECTED",
] as const;
