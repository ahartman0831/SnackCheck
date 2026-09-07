import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@snackcheck/db-types";
import {
  collectCatalogEvidence,
  type EvidenceCandidate,
} from "../lib/catalog-evidence/collector";
import { OpenFoodFactsEvidenceAdapter } from "../lib/catalog-evidence/open-food-facts-adapter";
import { summarizeOpenFoodFactsComparison } from "../lib/catalog-evidence/open-food-facts-comparison";
import {
  createEvidenceRunStore,
  EVIDENCE_STAGING_CONFIRMATION,
  type EvidenceRpcClient,
} from "../lib/catalog-evidence/persistence";
import { assertStagingApplySafety } from "../lib/catalog-candidates/operation-safety";

const DEFAULT_TARGET = 5;
const MAX_TARGET = 15;
const MAX_RESPONSE_BYTES = 250_000;

type CandidateRow = Pick<
  Database["public"]["Tables"]["catalog_source_records"]["Row"],
  | "id"
  | "provider"
  | "brand"
  | "product_name"
  | "variant"
  | "size"
  | "normalized_gtin14"
  | "normalized_ingredient_text"
>;

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function target(argv: string[]): number {
  const value = Number(option(argv, "--target-count") ?? DEFAULT_TARGET);
  if (!Number.isInteger(value) || value < 1 || value > MAX_TARGET) {
    throw new Error(`--target-count must be between 1 and ${MAX_TARGET}.`);
  }
  return value;
}

function evidenceCandidate(row: CandidateRow): EvidenceCandidate {
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
    manufacturerHosts: [],
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const candidateLimit = target(argv);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userAgent = process.env.OPEN_FOOD_FACTS_USER_AGENT;
  if (!url || !key) throw new Error("Staging Supabase credentials are required.");
  if (!userAgent) throw new Error("OPEN_FOOD_FACTS_USER_AGENT is required.");
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
    .select(
      "id,provider,brand,product_name,variant,size,normalized_gtin14,normalized_ingredient_text",
    )
    .eq("candidate_state", "REVIEW_QUEUED")
    .eq("screen_status", "PASS")
    .eq("catalog_automation_route", "AUTO_EVIDENCE")
    .eq("discontinued", false)
    .order("id", { ascending: true })
    .limit(candidateLimit);
  if (selected.error) throw new Error(selected.error.message);
  const candidates = (selected.data ?? []).map(evidenceCandidate);
  if (!candidates.length)
    throw new Error("No eligible automatic-evidence candidates were found.");

  const runId = option(argv, "--run-id") ?? randomUUID();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      runId,
    )
  ) {
    throw new Error("--run-id must be a lowercase UUID.");
  }
  const selectionHash = createHash("sha256")
    .update(candidates.map(({ id }) => id).join("\n"))
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
      adapter: new OpenFoodFactsEvidenceAdapter({ userAgent }),
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
          source: "OPEN_FOOD_FACTS_SECONDARY",
          candidatesAttempted: summary.candidatesAttempted,
          requestsMade: summary.requestsMade,
          evidenceFound: summary.evidenceFound,
          notFound: summary.notFound,
          blocked: summary.blocked,
          failed: summary.failed,
          comparisons: summary.attempts
            .map((attempt) => {
              const candidate = candidates.find(({ id }) => id === attempt.candidateId);
              const row = (selected.data ?? []).find(
                ({ id }) => id === attempt.candidateId,
              );
              if (!candidate || !row) return null;
              return summarizeOpenFoodFactsComparison(
                {
                  id: candidate.id,
                  normalizedGtin14: candidate.normalizedGtin14,
                  brand: candidate.brand,
                  productName: candidate.productName,
                  size: candidate.size,
                  normalizedIngredientText: row.normalized_ingredient_text,
                },
                attempt,
              );
            })
            .filter((comparison) => comparison !== null),
          outcomes: summary.attempts.map(({ candidateId, outcome, reasonCode }) => ({
            candidateId,
            outcome,
            reasonCode,
          })),
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
