import { createHash } from "node:crypto";
import {
  CATALOG_EVIDENCE_COMPARISON_PROMPT_VERSION,
  type EvidenceComparisonProvider,
} from "./ai-comparison-contracts";
import type { EvidenceComparisonResult } from "./ai-comparison-orchestrator";

export const AI_COMPARISON_STAGING_CONFIRMATION =
  "COMPARE_CATALOG_EVIDENCE_WITH_AI_IN_STAGING";

type RpcResult = { data: unknown; error: { message: string } | null };

export interface AiComparisonRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
}

export type AiComparisonRunCandidate = {
  candidateId: string;
  evidenceAttemptId: string;
};

function rpcError(operation: string, error: { message: string } | null): void {
  if (error) throw new Error(`${operation} failed: ${error.message}`);
}

export function aiComparisonSelectionHash(
  candidates: AiComparisonRunCandidate[],
): string {
  return createHash("sha256")
    .update(
      candidates
        .map(
          ({ candidateId, evidenceAttemptId }) => `${candidateId}\t${evidenceAttemptId}`,
        )
        .join("\n"),
    )
    .digest("hex");
}

export function createAiComparisonRunStore(client: AiComparisonRpcClient) {
  return {
    async begin(input: {
      runId: string;
      provider: EvidenceComparisonProvider["name"];
      model: string;
      candidates: AiComparisonRunCandidate[];
      confirmation: string;
    }): Promise<unknown> {
      if (input.confirmation !== AI_COMPARISON_STAGING_CONFIRMATION) {
        throw new Error(
          `AI comparison apply requires ${AI_COMPARISON_STAGING_CONFIRMATION}.`,
        );
      }
      const result = await client.rpc("begin_catalog_evidence_ai_run", {
        p_run: {
          runId: input.runId,
          promptVersion: CATALOG_EVIDENCE_COMPARISON_PROMPT_VERSION,
          provider: input.provider,
          model: input.model,
          selectionHash: aiComparisonSelectionHash(input.candidates),
        },
        p_candidate_ids: input.candidates.map(({ candidateId }) => candidateId),
        p_evidence_attempt_ids: input.candidates.map(
          ({ evidenceAttemptId }) => evidenceAttemptId,
        ),
        p_confirmation: input.confirmation,
      });
      rpcError("Beginning AI comparison run", result.error);
      return result.data;
    },

    async claim(runId: string, candidateId: string): Promise<boolean> {
      const result = await client.rpc("claim_catalog_evidence_ai_slot", {
        p_run_id: runId,
        p_candidate_id: candidateId,
      });
      rpcError("Claiming AI comparison slot", result.error);
      return result.data === true;
    },

    async record(input: {
      runId: string;
      candidateId: string;
      evidenceAttemptId: string;
      result: EvidenceComparisonResult;
    }): Promise<unknown> {
      if (!input.result.attempt) {
        throw new Error("An unclaimed AI comparison cannot be recorded.");
      }
      const { attempt } = input.result;
      const comparison = input.result.ok ? input.result.comparison : null;
      const result = await client.rpc("record_catalog_evidence_ai_attempt", {
        p_run_id: input.runId,
        p_attempt: {
          candidateId: input.candidateId,
          evidenceAttemptId: input.evidenceAttemptId,
          provider: attempt.provider,
          model: attempt.model,
          promptVersion: attempt.promptVersion,
          providerRequestId: attempt.usage?.providerRequestId,
          outcome: attempt.outcome,
          failureCode: attempt.failureCode,
          identity: comparison?.identity,
          ingredientAgreement: comparison?.ingredientAgreement,
          discrepancyCodes: comparison?.discrepancyCodes ?? [],
          confidence: comparison?.confidence,
          advisoryRoute: input.result.advisoryRoute,
          deterministicConflict: input.result.ok
            ? input.result.deterministicConflict
            : true,
          latencyMs: attempt.latencyMs,
          inputTokens: attempt.usage?.inputTokens,
          cachedInputTokens: attempt.usage?.cachedInputTokens,
          outputTokens: attempt.usage?.outputTokens,
          reasoningTokens: attempt.usage?.reasoningTokens,
        },
      });
      rpcError("Recording AI comparison", result.error);
      return result.data;
    },

    async reconcileReservation(
      runId: string,
      candidateId: string,
    ): Promise<{
      released: boolean;
      circuitOpened: boolean;
    }> {
      const result = await client.rpc("reconcile_catalog_evidence_ai_reservation", {
        p_run_id: runId,
        p_candidate_id: candidateId,
      });
      rpcError("Reconciling AI comparison reservation", result.error);
      const data = result.data as { released?: unknown; circuitOpened?: unknown } | null;
      return {
        released: data?.released === true,
        circuitOpened: data?.circuitOpened === true,
      };
    },

    async complete(runId: string, status: "COMPLETED" | "FAILED"): Promise<unknown> {
      const result = await client.rpc("complete_catalog_evidence_ai_run", {
        p_run_id: runId,
        p_status: status,
      });
      rpcError("Completing AI comparison run", result.error);
      return result.data;
    },
  };
}
