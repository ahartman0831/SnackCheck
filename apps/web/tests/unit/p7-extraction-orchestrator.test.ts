import { describe, expect, it, vi } from "vitest";
import type { ExtractionProvider } from "@/lib/ai/contracts";
import { orchestrateExtraction } from "@/lib/ai/orchestrator";
import { parseProviderOutput } from "@/lib/ai/output-validator";

const extraction = (text: string, confidence = 0.95) =>
  JSON.stringify({
    panelFound: true,
    rawText: text,
    ingredientText: text,
    ingredients: [],
    overallConfidence: confidence,
    warnings: [],
  });

const provider = (model: string, output: string): ExtractionProvider => ({
  name: "fixture",
  model,
  extract: vi.fn(async () => ({ outputText: output })),
});

const base = {
  input: {
    bytes: Buffer.from("image"),
    mediaType: "image/jpeg" as const,
    sanitizedSha256: "a".repeat(64),
    submissionId: "submission",
  },
  budget: { claim: vi.fn(async () => true) },
  enabled: true,
  promptVersion: "p7-v1",
  confidenceThreshold: 0.8,
  timeoutMs: 100,
};

describe("Phase 7 extraction boundaries", () => {
  it("rejects prose, oversized output, and compliance-bearing output", () => {
    expect(() => parseProviderOutput(`Here: ${extraction("salt")}`)).toThrow();
    expect(() => parseProviderOutput("x".repeat(32_001))).toThrow();
    expect(() =>
      parseProviderOutput(
        JSON.stringify({ ...JSON.parse(extraction("salt")), complianceStatus: "PASS" }),
      ),
    ).toThrow(/compliance/i);
  });

  it("returns a strong extraction for explicit confirmation without calling fallback", async () => {
    const first = provider("primary", extraction("sugar, salt"));
    const fallback = provider("fallback", extraction("unused"));
    const result = await orchestrateExtraction({ ...base, providers: [first, fallback] });
    expect(result.ok).toBe(true);
    expect(result.ok && result.requiresConfirmation).toBe(true);
    expect(result.ok && result.quality).toBe("ACCEPTED");
    expect(fallback.extract).not.toHaveBeenCalled();
  });

  it("escalates low confidence and fails closed on provider disagreement", async () => {
    const result = await orchestrateExtraction({
      ...base,
      providers: [
        provider("primary", extraction("sugar, salt", 0.4)),
        provider("fallback", extraction("sugar, peanuts", 0.95)),
      ],
    });
    expect(result).toMatchObject({ ok: false, code: "PROVIDER_CONFLICT" });
  });

  it("retries one transient provider failure with bounded jitter", async () => {
    const extract = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary outage"))
      .mockResolvedValueOnce({ outputText: extraction("sugar, salt") });
    const result = await orchestrateExtraction({
      ...base,
      providers: [{ name: "fixture", model: "primary", extract }],
      retryBaseDelayMs: 0,
    });

    expect(result).toMatchObject({ ok: true, quality: "ACCEPTED" });
    expect(result.attempts).toHaveLength(2);
    expect(extract).toHaveBeenCalledTimes(2);
  });

  it("honors kill switch, budget gate, and maximum three calls", async () => {
    expect(
      await orchestrateExtraction({ ...base, enabled: false, providers: [] }),
    ).toMatchObject({ ok: false, code: "KILL_SWITCH" });
    expect(
      await orchestrateExtraction({
        ...base,
        budget: { claim: async () => false },
        providers: [],
      }),
    ).toMatchObject({ ok: false, code: "BUDGET_EXHAUSTED" });

    const providers = Array.from({ length: 5 }, (_, index) =>
      provider(`model-${index}`, "not-json"),
    );
    const result = await orchestrateExtraction({ ...base, providers });
    expect(result.attempts).toHaveLength(3);
  });
});
