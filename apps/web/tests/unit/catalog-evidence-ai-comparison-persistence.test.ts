import { describe, expect, it, vi } from "vitest";
import {
  AI_COMPARISON_STAGING_CONFIRMATION,
  aiComparisonSelectionHash,
  createAiComparisonRunStore,
  type AiComparisonRpcClient,
} from "@/lib/catalog-evidence/ai-comparison-persistence";

function client(data: unknown = true) {
  const rpc = vi.fn().mockResolvedValue({ data, error: null });
  return { rpc } satisfies AiComparisonRpcClient;
}

const candidates = [
  {
    candidateId: "01124853-12d7-4810-bde3-b828a156ee54",
    evidenceAttemptId: "11124853-12d7-4810-bde3-b828a156ee54",
  },
];

describe("AI comparison persistence", () => {
  it("binds the exact candidate/evidence selection and requires confirmation", async () => {
    expect(aiComparisonSelectionHash(candidates)).toMatch(/^[0-9a-f]{64}$/);
    const rpcClient = client();
    const store = createAiComparisonRunStore(rpcClient);
    await expect(
      store.begin({
        runId: "21124853-12d7-4810-bde3-b828a156ee54",
        provider: "openai",
        model: "configured-model",
        candidates,
        confirmation: "WRONG",
      }),
    ).rejects.toThrow(AI_COMPARISON_STAGING_CONFIRMATION);
    await store.begin({
      runId: "21124853-12d7-4810-bde3-b828a156ee54",
      provider: "openai",
      model: "configured-model",
      candidates,
      confirmation: AI_COMPARISON_STAGING_CONFIRMATION,
    });
    expect(rpcClient.rpc).toHaveBeenCalledWith(
      "begin_catalog_evidence_ai_run",
      expect.objectContaining({
        p_candidate_ids: [candidates[0].candidateId],
        p_evidence_attempt_ids: [candidates[0].evidenceAttemptId],
        p_confirmation: AI_COMPARISON_STAGING_CONFIRMATION,
      }),
    );
  });

  it("claims, records detailed usage, and completes through guarded RPCs", async () => {
    const rpcClient = client(true);
    const store = createAiComparisonRunStore(rpcClient);
    await expect(store.claim("run-1", candidates[0].candidateId)).resolves.toBe(true);
    await store.record({
      runId: "run-1",
      ...candidates[0],
      result: {
        ok: true,
        comparison: {
          identity: "MATCH",
          ingredientAgreement: "EXACT",
          discrepancyCodes: [],
          confidence: 0.99,
          recommendedRoute: "CONTINUE_DETERMINISTIC",
        },
        advisoryRoute: "CONTINUE_DETERMINISTIC",
        deterministicConflict: false,
        attempt: {
          provider: "openai",
          model: "configured-model",
          promptVersion: "catalog-evidence-compare-v1",
          latencyMs: 123,
          outcome: "ACCEPTED",
          usage: {
            providerRequestId: "response-1",
            inputTokens: 100,
            cachedInputTokens: 10,
            outputTokens: 20,
            reasoningTokens: 5,
          },
        },
      },
    });
    expect(rpcClient.rpc).toHaveBeenCalledWith(
      "record_catalog_evidence_ai_attempt",
      expect.objectContaining({
        p_attempt: expect.objectContaining({
          providerRequestId: "response-1",
          inputTokens: 100,
          cachedInputTokens: 10,
          outputTokens: 20,
          reasoningTokens: 5,
          advisoryRoute: "CONTINUE_DETERMINISTIC",
        }),
      }),
    );
    await store.complete("run-1", "COMPLETED");
    expect(rpcClient.rpc).toHaveBeenLastCalledWith("complete_catalog_evidence_ai_run", {
      p_run_id: "run-1",
      p_status: "COMPLETED",
    });
  });

  it("does not record a kill-switch or budget rejection that made no provider call", async () => {
    const store = createAiComparisonRunStore(client());
    await expect(
      store.record({
        runId: "run-1",
        ...candidates[0],
        result: {
          ok: false,
          code: "KILL_SWITCH",
          advisoryRoute: "HUMAN_EXCEPTION",
          attempt: null,
        },
      }),
    ).rejects.toThrow("unclaimed");
  });
});
