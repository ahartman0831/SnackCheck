import { describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import type { EvidenceComparisonInput } from "@/lib/catalog-evidence/ai-comparison-contracts";
import { OpenAiEvidenceComparisonProvider } from "@/lib/catalog-evidence/openai-comparison-provider";

vi.mock("server-only", () => ({}));

const input: EvidenceComparisonInput = {
  candidate: {
    id: "01124853-12d7-4810-bde3-b828a156ee54",
    gtin14: "00012345678905",
    brand: "Fixture Foods",
    productName: "Pretzel Bites",
    variant: null,
    size: "1 oz",
    ingredientText: "Wheat flour, salt",
  },
  evidence: [
    {
      sourceKind: "MANUFACTURER",
      sourceUrl: "https://fixturefoods.example/product",
      observedAt: null,
      productName: "Pretzel Bites",
      brand: "Fixture Foods",
      gtins: ["00012345678905"],
      quantity: "1 oz",
      ingredientText: "Wheat flour, salt",
    },
  ],
};

describe("OpenAI catalog evidence comparison provider", () => {
  it("uses non-retained structured output and records provider usage", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "response-1",
      output_text: JSON.stringify({
        identity: "MATCH",
        ingredientAgreement: "EXACT",
        discrepancyCodes: [],
        confidence: 0.99,
        recommendedRoute: "CONTINUE_DETERMINISTIC",
      }),
      usage: {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 10 },
        output_tokens: 20,
        output_tokens_details: { reasoning_tokens: 5 },
      },
    });
    const client = { responses: { create } } as unknown as OpenAI;
    const provider = new OpenAiEvidenceComparisonProvider(
      "configured-model",
      "test-key",
      client,
    );
    const result = await provider.compare(input, new AbortController().signal);

    const request = create.mock.calls[0][0];
    expect(request).toMatchObject({
      model: "configured-model",
      store: false,
      max_output_tokens: 800,
      text: {
        format: {
          type: "json_schema",
          name: "catalog_evidence_comparison",
          strict: true,
        },
      },
    });
    expect(request.tools).toBeUndefined();
    expect(request.input[0].content[0].text).toContain("untrusted_evidence_payload");
    expect(result.usage).toEqual({
      providerRequestId: "response-1",
      inputTokens: 100,
      cachedInputTokens: 10,
      outputTokens: 20,
      reasoningTokens: 5,
    });
  });
});
