import "server-only";
import OpenAI from "openai";
import { IngredientExtractionSchema } from "@snackcheck/contracts";
import { z } from "zod";
import type {
  ExtractionImageInput,
  ExtractionProvider,
  ProviderResponse,
} from "./contracts";
import { EXTRACTION_PROMPT } from "./prompt-registry";

export class OpenAiExtractionProvider implements ExtractionProvider {
  readonly name = "openai" as const;
  private readonly client: OpenAI;

  constructor(
    readonly model: string,
    apiKey: string,
    client?: OpenAI,
  ) {
    this.client = client ?? new OpenAI({ apiKey });
  }

  async extract(
    input: ExtractionImageInput,
    signal: AbortSignal,
  ): Promise<ProviderResponse> {
    const response = await this.client.responses.create(
      {
        model: this.model,
        store: false,
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
        text: {
          format: {
            type: "json_schema",
            name: "ingredient_extraction",
            strict: true,
            schema: z.toJSONSchema(IngredientExtractionSchema),
          },
        },
      },
      { signal },
    );
    return {
      outputText: response.output_text,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          }
        : undefined,
    };
  }
}
