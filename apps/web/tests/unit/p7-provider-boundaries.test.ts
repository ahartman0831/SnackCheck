import { describe, expect, it, vi } from "vitest";
import { GeminiExtractionProvider } from "@/lib/ai/gemini-provider";

vi.mock("server-only", () => ({}));

describe("Phase 7 provider boundaries", () => {
  it("sends only inline sanitized bytes and a transcription-only schema to Gemini", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body));
      expect(request.input[1]).toMatchObject({
        type: "image",
        data: Buffer.from("sanitized").toString("base64"),
        mime_type: "image/jpeg",
      });
      expect(request.store).toBe(false);
      expect(JSON.stringify(request).toLowerCase()).not.toContain("compliancestatus");
      return new Response(
        JSON.stringify({
          id: "interaction-1",
          usage: {
            total_input_tokens: 20,
            total_output_tokens: 10,
            input_tokens_details: { cached_tokens: 4 },
          },
          steps: [
            { type: "thought" },
            {
              type: "model_output",
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    panelFound: true,
                    rawText: "salt",
                    ingredientText: "salt",
                    ingredients: [],
                    overallConfidence: 0.99,
                    warnings: [],
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const provider = new GeminiExtractionProvider(
      "configured-model",
      "test-key",
      fetchImpl as typeof fetch,
    );
    const result = await provider.extract(
      {
        bytes: Buffer.from("sanitized"),
        mediaType: "image/jpeg",
        sanitizedSha256: "a".repeat(64),
        submissionId: "submission",
      },
      new AbortController().signal,
    );
    expect(JSON.parse(result.outputText).ingredientText).toBe("salt");
    expect(result.usage).toMatchObject({
      providerRequestId: "interaction-1",
      inputTokens: 20,
      cachedInputTokens: 4,
      outputTokens: 10,
    });
  });
});
