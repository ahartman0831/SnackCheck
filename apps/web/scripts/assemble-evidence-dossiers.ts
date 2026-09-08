import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@snackcheck/db-types";
import {
  createEvidenceDossier,
  EVIDENCE_DOSSIER_STAGING_CONFIRMATION,
  EvidenceDossierManifestSchema,
  type EvidenceDossierManifest,
  type EvidenceDossierRpcClient,
} from "../lib/catalog-evidence/evidence-dossier";
import { isPlausibleIngredientStatement } from "../lib/catalog-evidence/manufacturer-page";
import { assertStagingApplySafety } from "../lib/catalog-candidates/operation-safety";

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function loadManifest(path: string): Promise<EvidenceDossierManifest> {
  const bytes = await readFile(path);
  if (bytes.byteLength > 128_000)
    throw new Error("Dossier manifest exceeded the byte limit.");
  return EvidenceDossierManifestSchema.parse(JSON.parse(bytes.toString("utf8")));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const manifestPath = option(argv, "--manifest");
  if (!manifestPath) throw new Error("--manifest is required.");
  const manifest = await loadManifest(manifestPath);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Staging Supabase credentials are required.");
  if (apply) {
    assertStagingApplySafety({
      argv,
      confirmation: EVIDENCE_DOSSIER_STAGING_CONFIRMATION,
      url,
    });
  }

  const admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  const output: {
    candidateId: string;
    dossierId: string;
    evidenceAttemptIds: string[];
  }[] = [];
  for (const entry of manifest) {
    const evidenceResult = await admin
      .from("catalog_evidence_attempts")
      .select("id,source_url,source_kind,ingredient_text,created_at")
      .eq("candidate_id", entry.candidateId)
      .eq("outcome", "EVIDENCE_FOUND")
      .in(
        "source_url",
        entry.items.map(({ sourceUrl }) => sourceUrl),
      )
      .order("created_at", { ascending: false });
    if (evidenceResult.error) throw new Error(evidenceResult.error.message);
    const latestByUrl = new Map(
      (evidenceResult.data ?? []).map((row) => [row.source_url, row]),
    );
    const items = entry.items.map(({ sourceUrl, role }) => {
      const evidence = latestByUrl.get(sourceUrl);
      if (!evidence) throw new Error(`No stored evidence matched ${sourceUrl}.`);
      if (
        role === "INGREDIENTS" &&
        (evidence.source_kind !== "MANUFACTURER" ||
          !isPlausibleIngredientStatement(evidence.ingredient_text))
      ) {
        throw new Error(
          `Ingredient source ${sourceUrl} is not clean manufacturer evidence.`,
        );
      }
      return { evidenceAttemptId: evidence.id, role };
    });
    const dossierId = randomUUID();
    let persistedDossierId: string = dossierId;
    if (apply) {
      const result = await createEvidenceDossier(
        admin as unknown as EvidenceDossierRpcClient,
        {
          dossierId,
          candidateId: entry.candidateId,
          items,
          confirmation: EVIDENCE_DOSSIER_STAGING_CONFIRMATION,
        },
      );
      persistedDossierId = result.dossierId;
    }
    output.push({
      candidateId: entry.candidateId,
      dossierId: persistedDossierId,
      evidenceAttemptIds: items.map(({ evidenceAttemptId }) => evidenceAttemptId),
    });
  }
  console.log(
    JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", dossiers: output }, null, 2),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Dossier assembly failed.");
  process.exit(1);
});
