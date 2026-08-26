import type { IngredientExtraction } from "@snackcheck/contracts";

export interface IngredientImageInput {
  bytes: Buffer;
  mediaType: string;
  submissionId: string;
}

export interface IngredientExtractionProvider {
  extract(input: IngredientImageInput): Promise<IngredientExtraction>;
}
