import { z } from "zod";

export const AnalyticsEventNameSchema = z.enum([
  "search_performed",
  "search_zero_results",
  "barcode_scan_started",
  "barcode_scan_succeeded",
  "barcode_unknown",
  "ingredient_upload_started",
  "ingredient_extraction_succeeded",
  "ingredient_extraction_failed",
  "extraction_confirmed",
  "evaluation_viewed",
  "product_shared",
  "changed_package_reported",
]);
export type AnalyticsEventName = z.infer<typeof AnalyticsEventNameSchema>;

export const AnalyticsEventSchema = z.object({
  name: AnalyticsEventNameSchema,
  properties: z
    .object({
      resultCount: z.number().int().nonnegative().optional(),
      category: z.string().max(64).optional(),
      ingredientStatus: z.enum(["PASS", "FAIL", "VERIFY"]).optional(),
      failureCode: z.string().max(64).optional(),
      queryLength: z.number().int().nonnegative().optional(),
    })
    .strict()
    .default({}),
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
