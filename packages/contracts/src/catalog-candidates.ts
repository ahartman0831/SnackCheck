import { z } from "zod";
import { QualityFlagSchema } from "./compliance";
import { IngredientStatusSchema } from "./enums";

export const CatalogProviderSchema = z.enum(["USDA_FDC", "OPEN_FOOD_FACTS"]);
export type CatalogProvider = z.infer<typeof CatalogProviderSchema>;

export const CatalogCandidateStateSchema = z.enum([
  "IMPORTED",
  "SCREENED_PASS",
  "SCREENED_FAIL",
  "SCREENED_VERIFY",
  "REVIEW_QUEUED",
  "PROMOTED",
  "REJECTED",
  "SUPERSEDED",
]);
export type CatalogCandidateState = z.infer<typeof CatalogCandidateStateSchema>;

export const CatalogSourceRecordSchema = z.object({
  importBatchId: z.string().uuid().optional(),
  provider: CatalogProviderSchema,
  externalRecordId: z.string().trim().min(1).max(200),
  sourceVersion: z.string().trim().min(1).max(200),
  sourceRecordSha256: z.string().regex(/^[0-9a-f]{64}$/),
  sourceGtin: z.string().trim().min(1).max(32),
  normalizedGtin14: z.string().regex(/^\d{14}$/),
  brand: z.string().trim().min(1).max(200),
  productName: z.string().trim().min(1).max(300),
  variant: z.string().trim().nullable(),
  size: z.string().trim().nullable(),
  category: z.string().trim().nullable(),
  rawIngredientText: z.string().trim().min(1).max(20_000),
  normalizedIngredientText: z.string().trim().min(1).max(20_000),
  ingredientTextSha256: z.string().regex(/^[0-9a-f]{64}$/),
  marketCountry: z.string().trim().min(1).max(120),
  sourceModifiedAt: z.string().datetime().nullable(),
  sourcePublishedAt: z.string().datetime().nullable(),
  discontinued: z.boolean(),
  sourceUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://")),
  sourceReference: z.string().trim().min(1).max(300),
  licenseIdentifier: z.string().trim().min(1).max(120),
  attribution: z.string().trim().nullable(),
  screenStatus: IngredientStatusSchema,
  qualityFlags: z.array(QualityFlagSchema),
  matchedRuleIds: z.array(z.string()),
  engineVersion: z.string().trim().min(1).max(120),
  rulesetHash: z.string().regex(/^[0-9a-f]{64}$/),
});
export type CatalogSourceRecord = z.infer<typeof CatalogSourceRecordSchema>;

export const CatalogImportErrorCategorySchema = z.enum([
  "INVALID_ROW",
  "INVALID_GTIN",
  "MISSING_INGREDIENTS",
  "NON_US_MARKET",
  "DISCONTINUED",
  "DUPLICATE_IN_FILE",
]);
export type CatalogImportErrorCategory = z.infer<typeof CatalogImportErrorCategorySchema>;
