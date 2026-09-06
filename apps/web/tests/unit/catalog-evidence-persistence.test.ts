import { describe, expect, it, vi } from "vitest";
import {
  createEvidenceRunStore,
  EVIDENCE_STAGING_CONFIRMATION,
  type EvidenceRpcClient,
} from "@/lib/catalog-evidence/persistence";
import type { EvidenceAttempt } from "@/lib/catalog-evidence/collector";

function client(result: { data: unknown; error: { message: string } | null }) {
  return { rpc: vi.fn().mockResolvedValue(result) } satisfies EvidenceRpcClient;
}

const start = {
  runId: "a3000000-0000-4000-8000-000000000001",
  candidateIds: ["a2000000-0000-4000-8000-000000000001"],
  selectionHash: "a".repeat(64),
  limits: {
    maxRequestsPerCandidate: 3,
    maxRequestsPerRun: 285,
    maxResponseBytes: 2_000_000,
  },
  confirmation: EVIDENCE_STAGING_CONFIRMATION,
};

describe("catalog evidence persistence", () => {
  it("starts an exact versioned run through the guarded RPC", async () => {
    const rpc = client({ data: { runId: start.runId }, error: null });
    await createEvidenceRunStore(rpc).begin(start);
    expect(rpc.rpc).toHaveBeenCalledWith("begin_catalog_evidence_run", {
      p_run: expect.objectContaining({
        runId: start.runId,
        collectorVersion: "catalog-evidence-v1",
        sourcePolicyVersion: "evidence-source-v1",
        selectionHash: start.selectionHash,
      }),
      p_candidate_ids: start.candidateIds,
      p_confirmation: EVIDENCE_STAGING_CONFIRMATION,
    });
  });

  it("refuses to begin without the exact staging confirmation", async () => {
    const rpc = client({ data: null, error: null });
    await expect(
      createEvidenceRunStore(rpc).begin({ ...start, confirmation: "WRONG" }),
    ).rejects.toThrow(EVIDENCE_STAGING_CONFIRMATION);
    expect(rpc.rpc).not.toHaveBeenCalled();
  });

  it("records explicit attempts and closes the run", async () => {
    const rpc = client({ data: {}, error: null });
    const store = createEvidenceRunStore(rpc);
    const attempt: EvidenceAttempt = {
      candidateId: start.candidateIds[0],
      outcome: "NOT_FOUND",
      reasonCode: "NO_DISCOVERY_RESULT",
      requestCount: 1,
      evidence: null,
    };
    await store.writer().saveAttempt(start.runId, attempt);
    await store.complete(start.runId, "COMPLETED");
    expect(rpc.rpc).toHaveBeenNthCalledWith(1, "record_catalog_evidence_attempt", {
      p_run_id: start.runId,
      p_attempt: attempt,
    });
    expect(rpc.rpc).toHaveBeenNthCalledWith(2, "complete_catalog_evidence_run", {
      p_run_id: start.runId,
      p_status: "COMPLETED",
    });
  });

  it("fails closed when persistence reports an error", async () => {
    const rpc = client({ data: null, error: { message: "run budget exceeded" } });
    await expect(createEvidenceRunStore(rpc).begin(start)).rejects.toThrow(
      "Beginning evidence run failed: run budget exceeded",
    );
  });
});
