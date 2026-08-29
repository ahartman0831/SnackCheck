import { describe, expect, it, vi } from "vitest";
import { GeminiExtractionProvider } from "@/lib/ai/gemini-provider";

describe("Phase 7 provider boundaries", () => {
  it("sends only inline sanitized bytes and a transcription-only schema to Gemini", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body));
      expect(request.input[1]).toMatchObject({
        type: "image",
        data: Buffer.from("sanitized").toString("base64"),
        mime_type: "image/jpeg",
      });
      expect(JSON.stringify(request).toLowerCase()).not.toContain("compliancestatus");
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            panelFound: true,
            rawText: "salt",
            ingredientText: "salt",
            ingredients: [],
            overallConfidence: 0.99,
            warnings: [],
          }),
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
  });
});
