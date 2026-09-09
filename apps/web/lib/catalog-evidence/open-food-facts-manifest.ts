import { z } from "zod";

export const OpenFoodFactsManifestSchema = z
  .object({ candidateIds: z.array(z.string().uuid()).min(1).max(15) })
  .strict()
  .refine(({ candidateIds }) => new Set(candidateIds).size === candidateIds.length, {
    message: "Manifest candidate IDs must be unique.",
  });

export function selectManifestCandidates<T extends { id: string }>(
  manifest: z.infer<typeof OpenFoodFactsManifestSchema>,
  eligibleRows: T[],
): T[] {
  const rows = new Map(eligibleRows.map((row) => [row.id, row]));
  return manifest.candidateIds.map((id) => {
    const row = rows.get(id);
    if (!row) {
      throw new Error(
        "Every manifest candidate must still be eligible for evidence collection.",
      );
    }
    return row;
  });
}
