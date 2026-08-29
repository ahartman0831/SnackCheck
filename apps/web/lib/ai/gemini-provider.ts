import "server-only";
import { IngredientExtractionSchema } from "@snackcheck/contracts";
import { z } from "zod";
import type {
  ExtractionImageInput,
  ExtractionProvider,
  ProviderResponse,
} from "./contracts";
import { EXTRACTION_PROMPT } from "./prompt-registry";

const GeminiResponseSchema = z.object({
  id: z.string().optional(),
  output_text: z.string(),
  usage_metadata: z
    .object({
      input_tokens: z.number().optional(),
      cached_input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      reasoning_tokens: z.number().optional(),
    })
    .optional(),
});

export class GeminiExtractionProvider implements ExtractionProvider {
  readonly name = "gemini" as const;

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async extract(
    input: ExtractionImageInput,
    signal: AbortSignal,
  ): Promise<ProviderResponse> {
    const response = await this.fetchImpl(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          model: this.model,
          input: [
            { type: "text", text: EXTRACTION_PROMPT },
            {
              type: "image",
              data: input.bytes.toString("base64"),
              mime_type: input.mediaType,
            },
          ],
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: z.toJSONSchema(IngredientExtractionSchema),
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`Gemini request failed with ${response.status}`);
    const payload = GeminiResponseSchema.parse(await response.json());
    return {
      outputText: payload.output_text,
      usage: {
        providerRequestId: payload.id,
        inputTokens: payload.usage_metadata?.input_tokens,
        cachedInputTokens: payload.usage_metadata?.cached_input_tokens,
        outputTokens: payload.usage_metadata?.output_tokens,
        reasoningTokens: payload.usage_metadata?.reasoning_tokens,
      },
    };
  }
}
