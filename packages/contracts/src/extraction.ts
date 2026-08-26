import { z } from "zod";

export const ExtractionWarningSchema = z.enum([
  "BLURRY",
  "GLARE",
  "CROPPED",
  "MULTIPLE_PANELS",
  "NO_INGREDIENT_PANEL",
  "LOW_RESOLUTION",
  "UNREADABLE_TEXT",
  "LANGUAGE_UNSUPPORTED",
]);
export type ExtractionWarning = z.infer<typeof ExtractionWarningSchema>;

export const IngredientExtractionSchema = z.object({
  panelFound: z.boolean(),
  rawText: z.string().max(12_000),
  ingredientText: z.string().max(10_000),
  ingredients: z
    .array(
      z.object({
        raw: z.string().max(500),
        normalizedSuggestion: z.string().max(500),
        confidence: z.number().min(0).max(1),
        startOffset: z.number().int().nonnegative().nullable(),
        endOffset: z.number().int().nonnegative().nullable(),
      }),
    )
    .max(500),
  overallConfidence: z.number().min(0).max(1),
  warnings: z.array(ExtractionWarningSchema).max(10),
});
export type IngredientExtraction = z.infer<typeof IngredientExtractionSchema>;
