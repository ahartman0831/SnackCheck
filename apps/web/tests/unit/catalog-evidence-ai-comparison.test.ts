import { describe, expect, it, vi } from "vitest";
import type {
  EvidenceComparisonInput,
  EvidenceComparisonOutput,
  EvidenceComparisonProvider,
} from "@/lib/catalog-evidence/ai-comparison-contracts";
import { orchestrateEvidenceComparison } from "@/lib/catalog-evidence/ai-comparison-orchestrator";
import { parseEvidenceComparisonOutput } from "@/lib/catalog-evidence/ai-comparison-validator";

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
      sourceUrl: "https://fixturefoods.example/products/pretzel-bites",
      observedAt: "2026-09-01T00:00:00.000Z",
      productName: "Pretzel Bites",
      brand: "Fixture Foods",
      gtins: ["00012345678905"],
      quantity: "1 oz",
      ingredientText: "Wheat flour, salt.",
    },
  ],
};

const accepted: EvidenceComparisonOutput = {
  identity: "MATCH",
  ingredientAgreement: "FORMATTING_ONLY",
  discrepancyCodes: [],
  confidence: 0.99,
  recommendedRoute: "CONTINUE_DETERMINISTIC",
};

function provider(output: unknown = accepted): EvidenceComparisonProvider {
  return {
    name: "fixture",
    model: "fixture-model",
    compare: vi.fn().mockResolvedValue({
      outputText: JSON.stringify(output),
      usage: { inputTokens: 100, outputTokens: 20 },
    }),
  };
}

describe("AI evidence comparison", () => {
  it("allows only an exact, high-confidence identity comparison to continue", async () => {
    const result = await orchestrateEvidenceComparison({
      input,
      provider: provider(),
      budget: { claim: vi.fn().mockResolvedValue(true) },
      enabled: true,
      timeoutMs: 1_000,
    });
    expect(result).toMatchObject({
      ok: true,
      advisoryRoute: "CONTINUE_DETERMINISTIC",
      deterministicConflict: false,
      attempt: { outcome: "ACCEPTED", usage: { inputTokens: 100, outputTokens: 20 } },
    });
  });

  it("overrides an optimistic AI response when ingredient evidence differs", async () => {
    const result = await orchestrateEvidenceComparison({
      input: {
        ...input,
        evidence: [{ ...input.evidence[0], ingredientText: "Wheat flour, sugar" }],
      },
      provider: provider(),
      budget: { claim: vi.fn().mockResolvedValue(true) },
      enabled: true,
      timeoutMs: 1_000,
    });
    expect(result).toMatchObject({
      ok: true,
      advisoryRoute: "HUMAN_EXCEPTION",
      deterministicConflict: true,
      attempt: { outcome: "ROUTED_TO_HUMAN" },
    });
  });

  it("fails closed for low confidence, provider errors, disabled use, and exhausted budget", async () => {
    const lowConfidence = await orchestrateEvidenceComparison({
      input,
      provider: provider({ ...accepted, confidence: 0.8 }),
      budget: { claim: vi.fn().mockResolvedValue(true) },
      enabled: true,
      timeoutMs: 1_000,
    });
    expect(lowConfidence).toMatchObject({ advisoryRoute: "HUMAN_EXCEPTION" });

    const failingProvider = provider();
    vi.mocked(failingProvider.compare).mockRejectedValue(new Error("provider detail"));
    await expect(
      orchestrateEvidenceComparison({
        input,
        provider: failingProvider,
        budget: { claim: vi.fn().mockResolvedValue(true) },
        enabled: true,
        timeoutMs: 1_000,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "PROVIDER_ERROR",
      advisoryRoute: "HUMAN_EXCEPTION",
    });

    const disabledProvider = provider();
    const disabled = await orchestrateEvidenceComparison({
      input,
      provider: disabledProvider,
      budget: { claim: vi.fn() },
      enabled: false,
      timeoutMs: 1_000,
    });
    expect(disabled).toMatchObject({ ok: false, code: "KILL_SWITCH" });
    expect(disabledProvider.compare).not.toHaveBeenCalled();

    const exhaustedProvider = provider();
    const exhausted = await orchestrateEvidenceComparison({
      input,
      provider: exhaustedProvider,
      budget: { claim: vi.fn().mockResolvedValue(false) },
      enabled: true,
      timeoutMs: 1_000,
    });
    expect(exhausted).toMatchObject({ ok: false, code: "BUDGET_EXHAUSTED" });
    expect(exhaustedProvider.compare).not.toHaveBeenCalled();
  });

  it("rejects prose, invalid schemas, oversized output, and compliance fields", () => {
    expect(() => parseEvidenceComparisonOutput("looks fine")).toThrow("JSON object");
    expect(() =>
      parseEvidenceComparisonOutput(JSON.stringify({ identity: "MATCH" })),
    ).toThrow("contract");
    expect(() => parseEvidenceComparisonOutput(`{${" ".repeat(8_001)}}`)).toThrow(
      "oversized",
    );
    expect(() =>
      parseEvidenceComparisonOutput(
        JSON.stringify({ ...accepted, complianceStatus: "PASS" }),
      ),
    ).toThrow("prohibited");
  });
});
