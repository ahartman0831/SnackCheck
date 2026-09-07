import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@snackcheck/db-types";
import {
  collectCatalogEvidence,
  type EvidenceCandidate,
} from "../lib/catalog-evidence/collector";
import { ManufacturerEvidenceAdapter } from "../lib/catalog-evidence/manufacturer-adapter";
import {
  parseManufacturerManifest,
  type ManufacturerManifestEntry,
} from "../lib/catalog-evidence/manufacturer-manifest";
import {
  createEvidenceRunStore,
  EVIDENCE_STAGING_CONFIRMATION,
  type EvidenceRpcClient,
} from "../lib/catalog-evidence/persistence";
import { assertStagingApplySafety } from "../lib/catalog-candidates/operation-safety";

const MAX_MANIFEST_BYTES = 128_000;
const MAX_RESPONSE_BYTES = 500_000;

type CandidateRow = Pick<
  Database["public"]["Tables"]["catalog_source_records"]["Row"],
  "id" | "provider" | "brand" | "product_name" | "variant" | "size" | "normalized_gtin14"
>;

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function loadManifest(path: string): Promise<ManufacturerManifestEntry[]> {
  const bytes = await readFile(path);
  if (bytes.byteLength > MAX_MANIFEST_BYTES) {
    throw new Error("Manufacturer manifest exceeded the byte limit.");
  }
  return parseManufacturerManifest(JSON.parse(bytes.toString("utf8")));
}

function evidenceCandidate(
  row: CandidateRow,
  entry: ManufacturerManifestEntry,
): EvidenceCandidate {
  if (row.provider !== "USDA_FDC" && row.provider !== "OPEN_FOOD_FACTS") {
    throw new Error(`Candidate ${row.id} has an unsupported provider.`);
  }
  return {
    id: row.id,
    provider: row.provider,
    brand: row.brand,
    productName: row.product_name,
    variant: row.variant,
    size: row.size,
    normalizedGtin14: row.normalized_gtin14,
    manufacturerHosts: [entry.manufacturerHost],
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const manifestPath = option(argv, "--manifest");
  if (!manifestPath) throw new Error("--manifest is required.");
  const manifest = await loadManifest(manifestPath);
  if (!manifest.length) throw new Error("Manufacturer manifest is empty.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userAgent = process.env.CATALOG_EVIDENCE_USER_AGENT;
  if (!url || !key) throw new Error("Staging Supabase credentials are required.");
  if (!userAgent) throw new Error("CATALOG_EVIDENCE_USER_AGENT is required.");
  if (apply) {
    assertStagingApplySafety({
      argv,
      confirmation: EVIDENCE_STAGING_CONFIRMATION,
      url,
    });
  }

  const admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  const selected = await admin
    .from("catalog_source_records")
    .select("id,provider,brand,product_name,variant,size,normalized_gtin14")
    .in(
      "id",
      manifest.map(({ candidateId }) => candidateId),
    )
    .eq("candidate_state", "REVIEW_QUEUED")
    .eq("screen_status", "PASS")
    .eq("catalog_automation_route", "AUTO_EVIDENCE")
    .eq("discontinued", false);
  if (selected.error) throw new Error(selected.error.message);
  const rows = new Map((selected.data ?? []).map((row) => [row.id, row]));
  if (rows.size !== manifest.length) {
    throw new Error(
      "Every manifest entry must resolve to an eligible evidence candidate.",
    );
  }
  const candidates = manifest.map((entry) => {
    const row = rows.get(entry.candidateId);
    if (!row) throw new Error("Manufacturer manifest candidate was not found.");
    return evidenceCandidate(row, entry);
  });

  const runId = option(argv, "--run-id") ?? randomUUID();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      runId,
    )
  ) {
    throw new Error("--run-id must be a lowercase UUID.");
  }
  const selectionHash = createHash("sha256")
    .update(
      manifest
        .map(
          ({ candidateId, sourceUrl, termsReviewedAt }) =>
            `${candidateId}\t${sourceUrl}\t${termsReviewedAt}`,
        )
        .join("\n"),
    )
    .digest("hex");
  const limits = {
    maxCandidates: candidates.length,
    maxRequestsPerCandidate: 1,
    maxRequestsPerRun: candidates.length,
    maxReferencesPerCandidate: 1,
    maxResponseBytes: MAX_RESPONSE_BYTES,
    timeoutMs: 15_000,
  } as const;
  const store = createEvidenceRunStore(admin as unknown as EvidenceRpcClient);
  if (apply) {
    await store.begin({
      runId,
      candidateIds: candidates.map(({ id }) => id),
      selectionHash,
      limits,
      confirmation: EVIDENCE_STAGING_CONFIRMATION,
    });
  }

  try {
    const summary = await collectCatalogEvidence({
      runId,
      candidates,
      adapter: new ManufacturerEvidenceAdapter(manifest, { userAgent }),
      apply,
      writer: apply ? store.writer() : undefined,
      limits,
    });
    if (apply) await store.complete(runId, "COMPLETED");
    console.log(
      JSON.stringify(
        {
          mode: apply ? "APPLY" : "DRY_RUN",
          runId,
          selectionHash,
          candidatesAttempted: summary.candidatesAttempted,
          requestsMade: summary.requestsMade,
          evidenceFound: summary.evidenceFound,
          notFound: summary.notFound,
          blocked: summary.blocked,
          failed: summary.failed,
          outcomes: summary.attempts.map(
            ({ candidateId, outcome, reasonCode, evidence }) => ({
              candidateId,
              outcome,
              reasonCode,
              sourceHost: evidence?.hostname ?? null,
              hasIngredientEvidence: Boolean(evidence?.ingredientText?.trim()),
            }),
          ),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (apply) await store.complete(runId, "FAILED");
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Evidence collection failed.");
  process.exit(1);
});
