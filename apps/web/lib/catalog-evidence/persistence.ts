import type {
  EvidenceAttempt,
  EvidenceAttemptWriter,
  EvidenceCollectorLimits,
} from "./collector";
import { EVIDENCE_COLLECTOR_VERSION } from "./collector";
import { EVIDENCE_SOURCE_POLICY_VERSION } from "./source-policy";

export const EVIDENCE_STAGING_CONFIRMATION = "COLLECT_CATALOG_EVIDENCE_TO_STAGING";

type RpcResult = { data: unknown; error: { message: string } | null };

export interface EvidenceRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
}

export type EvidenceRunStart = {
  runId: string;
  candidateIds: string[];
  selectionHash: string;
  limits: Pick<
    EvidenceCollectorLimits,
    "maxRequestsPerCandidate" | "maxRequestsPerRun" | "maxResponseBytes"
  >;
  confirmation: string;
};

function rpcError(operation: string, error: { message: string } | null): void {
  if (error) throw new Error(`${operation} failed: ${error.message}`);
}

export function createEvidenceRunStore(client: EvidenceRpcClient) {
  return {
    async begin(input: EvidenceRunStart): Promise<unknown> {
      if (input.confirmation !== EVIDENCE_STAGING_CONFIRMATION) {
        throw new Error(`Evidence apply requires ${EVIDENCE_STAGING_CONFIRMATION}.`);
      }
      const result = await client.rpc("begin_catalog_evidence_run", {
        p_run: {
          runId: input.runId,
          collectorVersion: EVIDENCE_COLLECTOR_VERSION,
          sourcePolicyVersion: EVIDENCE_SOURCE_POLICY_VERSION,
          selectionHash: input.selectionHash,
          maxRequestsPerCandidate: input.limits.maxRequestsPerCandidate,
          maxRequestsPerRun: input.limits.maxRequestsPerRun,
          maxResponseBytes: input.limits.maxResponseBytes,
        },
        p_candidate_ids: input.candidateIds,
        p_confirmation: input.confirmation,
      });
      rpcError("Beginning evidence run", result.error);
      return result.data;
    },

    writer(): EvidenceAttemptWriter {
      return {
        async saveAttempt(runId: string, attempt: EvidenceAttempt): Promise<void> {
          const result = await client.rpc("record_catalog_evidence_attempt", {
            p_run_id: runId,
            p_attempt: attempt,
          });
          rpcError("Recording evidence attempt", result.error);
        },
      };
    },

    async complete(runId: string, status: "COMPLETED" | "FAILED"): Promise<unknown> {
      const result = await client.rpc("complete_catalog_evidence_run", {
        p_run_id: runId,
        p_status: status,
      });
      rpcError("Completing evidence run", result.error);
      return result.data;
    },
  };
}
