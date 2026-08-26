import OpenAI from "openai";
import {
  IngredientExtractionSchema,
  type IngredientExtraction,
} from "@snackcheck/contracts";
import { env } from "@/lib/env";
import type {
  IngredientExtractionProvider,
  IngredientImageInput,
} from "./extraction-provider";
import { EXTRACTION_PROMPT } from "./prompt";

export class OpenAiExtractionProvider implements IngredientExtractionProvider {
  async extract(input: IngredientImageInput): Promise<IngredientExtraction> {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: env.OPENAI_VISION_MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: EXTRACTION_PROMPT },
            {
              type: "input_image",
              image_url: `data:${input.mediaType};base64,${input.bytes.toString("base64")}`,
              detail: "high",
            },
          ],
        },
      ],
    });
    const text = response.output_text;
    const parsed = IngredientExtractionSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new Error("Model output did not match the extraction schema");
    }
    return parsed.data;
  }
}
