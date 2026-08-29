import "server-only";
import { IngredientExtractionSchema } from "@snackcheck/contracts";
import { z } from "zod";
import type {
  ExtractionImageInput,
  ExtractionProvider,
  ProviderResponse,
} from "./contracts";
import { EXTRACTION_PROMPT } from "./prompt-registry";
import { classifyProviderHttpStatus, ExtractionProviderError } from "./provider-error";

const GeminiResponseSchema = z.object({
  id: z.string().optional(),
  output_text: z.string().optional(),
  steps: z
    .array(
      z
        .object({
          type: z.string(),
          content: z
            .array(
              z
                .object({
                  type: z.string(),
                  text: z.string().optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .passthrough(),
    )
    .optional(),
  usage: z
    .object({
      total_input_tokens: z.number().optional(),
      total_output_tokens: z.number().optional(),
      input_tokens_details: z.object({ cached_tokens: z.number().optional() }).optional(),
      output_tokens_details: z
        .object({ reasoning_tokens: z.number().optional() })
        .optional(),
    })
    .optional(),
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
          store: false,
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
    if (!response.ok) {
      throw new ExtractionProviderError(classifyProviderHttpStatus(response.status));
    }
    const payload = GeminiResponseSchema.parse(await response.json());
    const outputText =
      payload.output_text ??
      payload.steps
        ?.filter((step) => step.type === "model_output")
        .flatMap((step) => step.content ?? [])
        .filter((block) => block.type === "text" && block.text)
        .map((block) => block.text)
        .join("");
    if (!outputText) throw new Error("Gemini response did not contain text output");
    return {
      outputText,
      usage: {
        providerRequestId: payload.id,
        inputTokens:
          payload.usage?.total_input_tokens ?? payload.usage_metadata?.input_tokens,
        cachedInputTokens:
          payload.usage?.input_tokens_details?.cached_tokens ??
          payload.usage_metadata?.cached_input_tokens,
        outputTokens:
          payload.usage?.total_output_tokens ?? payload.usage_metadata?.output_tokens,
        reasoningTokens:
          payload.usage?.output_tokens_details?.reasoning_tokens ??
          payload.usage_metadata?.reasoning_tokens,
      },
    };
  }
}
