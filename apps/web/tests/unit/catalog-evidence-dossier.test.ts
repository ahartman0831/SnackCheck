import { describe, expect, it, vi } from "vitest";
import {
  createEvidenceDossier,
  EVIDENCE_DOSSIER_STAGING_CONFIRMATION,
  EvidenceDossierManifestSchema,
  evidenceDossierHash,
} from "@/lib/catalog-evidence/evidence-dossier";

const candidateId = "01124853-12d7-4810-bde3-b828a156ee54";
const evidenceAttemptId = "11124853-12d7-4810-bde3-b828a156ee55";

describe("evidence dossiers", () => {
  it("requires a bounded, unique manifest with an ingredient source", () => {
    expect(
      EvidenceDossierManifestSchema.parse([
        {
          candidateId,
          items: [
            {
              sourceUrl: "https://manufacturer.example/products/snack",
              role: "IDENTITY",
            },
            {
              sourceUrl: "https://manufacturer.example/products/snack/ingredients",
              role: "INGREDIENTS",
            },
          ],
        },
      ]),
    ).toHaveLength(1);
    expect(() =>
      EvidenceDossierManifestSchema.parse([
        {
          candidateId,
          items: [
            {
              sourceUrl: "https://manufacturer.example/products/snack",
              role: "IDENTITY",
            },
          ],
        },
      ]),
    ).toThrow("ingredient source");
  });

  it("hashes the ordered evidence and role selection", () => {
    const first = evidenceDossierHash(candidateId, [
      { evidenceAttemptId, role: "INGREDIENTS" },
    ]);
    const second = evidenceDossierHash(candidateId, [
      { evidenceAttemptId, role: "IDENTITY" },
    ]);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toBe(second);
  });

  it("requires exact staging confirmation and sends immutable source IDs", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        dossierId: "21124853-12d7-4810-bde3-b828a156ee56",
        idempotent: false,
      },
      error: null,
    });
    await expect(
      createEvidenceDossier(
        { rpc },
        {
          dossierId: "21124853-12d7-4810-bde3-b828a156ee56",
          candidateId,
          items: [{ evidenceAttemptId, role: "INGREDIENTS" }],
          confirmation: "wrong",
        },
      ),
    ).rejects.toThrow(EVIDENCE_DOSSIER_STAGING_CONFIRMATION);

    await createEvidenceDossier(
      { rpc },
      {
        dossierId: "21124853-12d7-4810-bde3-b828a156ee56",
        candidateId,
        items: [{ evidenceAttemptId, role: "INGREDIENTS" }],
        confirmation: EVIDENCE_DOSSIER_STAGING_CONFIRMATION,
      },
    );
    expect(rpc).toHaveBeenCalledWith(
      "create_catalog_evidence_dossier",
      expect.objectContaining({
        p_evidence_attempt_ids: [evidenceAttemptId],
        p_evidence_roles: ["INGREDIENTS"],
        p_confirmation: EVIDENCE_DOSSIER_STAGING_CONFIRMATION,
      }),
    );
  });
});
