import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import {
  EvidenceComparisonOutputSchema,
  type EvidenceComparisonInput,
  type EvidenceComparisonProvider,
  type EvidenceComparisonProviderResponse,
} from "./ai-comparison-contracts";
import { buildEvidenceComparisonInputText } from "./ai-comparison-prompt";

export class OpenAiEvidenceComparisonProvider implements EvidenceComparisonProvider {
  readonly name = "openai" as const;
  private readonly client: OpenAI;

  constructor(
    readonly model: string,
    apiKey: string,
    client?: OpenAI,
  ) {
    this.client = client ?? new OpenAI({ apiKey });
  }

  async compare(
    input: EvidenceComparisonInput,
    signal: AbortSignal,
  ): Promise<EvidenceComparisonProviderResponse> {
    const response = await this.client.responses.create(
      {
        model: this.model,
        store: false,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: buildEvidenceComparisonInputText(input) },
            ],
          },
        ],
        max_output_tokens: 800,
        text: {
          format: {
            type: "json_schema",
            name: "catalog_evidence_comparison",
            strict: true,
            schema: z.toJSONSchema(EvidenceComparisonOutputSchema),
          },
        },
      },
      { signal },
    );
    return {
      outputText: response.output_text,
      usage: response.usage
        ? {
            providerRequestId: response.id,
            inputTokens: response.usage.input_tokens,
            cachedInputTokens: response.usage.input_tokens_details?.cached_tokens,
            outputTokens: response.usage.output_tokens,
            reasoningTokens: response.usage.output_tokens_details?.reasoning_tokens,
          }
        : undefined,
    };
  }
}
