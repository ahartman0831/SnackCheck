import { createHash } from "node:crypto";
import { z } from "zod";

export const EVIDENCE_DOSSIER_STAGING_CONFIRMATION =
  "ASSEMBLE_CATALOG_EVIDENCE_DOSSIER_IN_STAGING";

export const EvidenceDossierManifestSchema = z
  .array(
    z
      .object({
        candidateId: z.string().uuid(),
        items: z
          .array(
            z
              .object({
                sourceUrl: z.string().url().startsWith("https://").max(2_000),
                role: z.enum(["IDENTITY", "INGREDIENTS", "SUPPORTING"]),
              })
              .strict(),
          )
          .min(1)
          .max(4),
      })
      .strict(),
  )
  .min(1)
  .max(5)
  .superRefine((entries, context) => {
    const candidateIds = entries.map(({ candidateId }) => candidateId);
    if (new Set(candidateIds).size !== candidateIds.length) {
      context.addIssue({ code: "custom", message: "Candidate IDs must be unique." });
    }
    for (const [index, entry] of entries.entries()) {
      const urls = entry.items.map(({ sourceUrl }) => sourceUrl);
      if (new Set(urls).size !== urls.length) {
        context.addIssue({
          code: "custom",
          path: [index, "items"],
          message: "A source URL may appear only once in a dossier.",
        });
      }
      if (!entry.items.some(({ role }) => role === "INGREDIENTS")) {
        context.addIssue({
          code: "custom",
          path: [index, "items"],
          message: "Each dossier needs an ingredient source.",
        });
      }
    }
  });

export type EvidenceDossierManifest = z.infer<typeof EvidenceDossierManifestSchema>;
export type EvidenceDossierRole =
  EvidenceDossierManifest[number]["items"][number]["role"];

export function evidenceDossierHash(
  candidateId: string,
  items: { evidenceAttemptId: string; role: EvidenceDossierRole }[],
): string {
  return createHash("sha256")
    .update(
      [
        candidateId,
        ...items.map(
          ({ evidenceAttemptId, role }, ordinal) =>
            `${ordinal}\t${role}\t${evidenceAttemptId}`,
        ),
      ].join("\n"),
    )
    .digest("hex");
}

type RpcResult = { data: unknown; error: { message: string } | null };

export interface EvidenceDossierRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
}

export async function createEvidenceDossier(
  client: EvidenceDossierRpcClient,
  input: {
    dossierId: string;
    candidateId: string;
    items: { evidenceAttemptId: string; role: EvidenceDossierRole }[];
    confirmation: string;
  },
): Promise<{ dossierId: string; idempotent: boolean }> {
  if (input.confirmation !== EVIDENCE_DOSSIER_STAGING_CONFIRMATION) {
    throw new Error(
      `Evidence dossier apply requires ${EVIDENCE_DOSSIER_STAGING_CONFIRMATION}.`,
    );
  }
  const result = await client.rpc("create_catalog_evidence_dossier", {
    p_dossier: {
      dossierId: input.dossierId,
      candidateId: input.candidateId,
      dossierSha256: evidenceDossierHash(input.candidateId, input.items),
    },
    p_evidence_attempt_ids: input.items.map(({ evidenceAttemptId }) => evidenceAttemptId),
    p_evidence_roles: input.items.map(({ role }) => role),
    p_confirmation: input.confirmation,
  });
  if (result.error)
    throw new Error(`Creating evidence dossier failed: ${result.error.message}`);
  return z
    .object({ dossierId: z.string().uuid(), idempotent: z.boolean() })
    .passthrough()
    .parse(result.data);
}
