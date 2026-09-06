import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  assessClassroomRelevance,
  CATALOG_RELEVANCE_VERSION,
  type ShortlistCandidate,
} from "../lib/catalog-candidates/shortlist";
import { assertStagingApplySafety } from "../lib/catalog-candidates/operation-safety";

const APPLY_CONFIRMATION = "APPLY_CLASSROOM_RELEVANCE_TO_STAGING";
const PAGE_SIZE = 500;
const APPLY_BATCH_SIZE = 1000;

type CandidateRow = {
  id: string;
  brand: string;
  product_name: string;
  category: string | null;
  variant: string | null;
  size: string | null;
  normalized_gtin14: string;
  source_modified_at: string | null;
  source_published_at: string | null;
  quality_flags: unknown;
  screen_status: string;
  candidate_state: string;
  discontinued: boolean;
};

type AssessmentRun = {
  algorithmVersion: typeof CATALOG_RELEVANCE_VERSION;
  assessedCount: number;
  selectionHash: string;
  corpusHash: string;
  runId: string;
  batchIndex: number;
  batchCount: number;
};

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function candidate(row: CandidateRow): ShortlistCandidate {
  return {
    id: row.id,
    brand: row.brand,
    productName: row.product_name,
    category: row.category,
    variant: row.variant,
    size: row.size,
    normalizedGtin14: row.normalized_gtin14,
    sourceModifiedAt: row.source_modified_at,
    sourcePublishedAt: row.source_published_at,
    qualityFlags: strings(row.quality_flags),
    screenStatus: row.screen_status,
    candidateState: row.candidate_state,
    discontinued: row.discontinued,
  };
}

function counts(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Staging Supabase credentials are required.");
  if (apply) assertStagingApplySafety({ argv, confirmation: APPLY_CONFIRMATION, url });

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const rows: CandidateRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await admin
      .from("catalog_source_records")
      .select(
        "id,brand,product_name,category,variant,size,normalized_gtin14,source_modified_at,source_published_at,quality_flags,screen_status,candidate_state,discontinued",
      )
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (page.error) throw new Error(page.error.message);
    const pageRows = (page.data ?? []) as CandidateRow[];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  const assessed = rows
    .map(candidate)
    .map((item) => ({ item, assessment: assessClassroomRelevance(item) }))
    .sort((left, right) =>
      left.item.id < right.item.id ? -1 : left.item.id > right.item.id ? 1 : 0,
    );
  if (!assessed.length) throw new Error("No candidates were available to assess.");

  const payload = assessed.map(({ item, assessment }) => ({
    id: item.id,
    version: assessment.version,
    group: assessment.group,
    score: assessment.score,
    tier: assessment.tier,
    route: assessment.route,
    reasons: assessment.reasons,
  }));
  const selectionHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  const runId = option(argv, "--run-id") ?? randomUUID();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      runId,
    )
  ) {
    throw new Error("--run-id must be a lowercase UUID.");
  }

  const applyResults: unknown[] = [];
  if (apply) {
    const rpc = admin.rpc.bind(admin) as unknown as (
      name: "apply_catalog_relevance_assessments",
      args: {
        p_assessments: typeof payload;
        p_run: AssessmentRun;
        p_confirmation: string;
      },
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
    const batchCount = Math.ceil(payload.length / APPLY_BATCH_SIZE);
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
      const batch = payload.slice(
        batchIndex * APPLY_BATCH_SIZE,
        (batchIndex + 1) * APPLY_BATCH_SIZE,
      );
      const batchHash = createHash("sha256").update(JSON.stringify(batch)).digest("hex");
      const run: AssessmentRun = {
        algorithmVersion: CATALOG_RELEVANCE_VERSION,
        assessedCount: batch.length,
        selectionHash: batchHash,
        corpusHash: selectionHash,
        runId,
        batchIndex,
        batchCount,
      };
      const applied = await rpc("apply_catalog_relevance_assessments", {
        p_assessments: batch,
        p_run: run,
        p_confirmation: APPLY_CONFIRMATION,
      });
      if (applied.error) throw new Error(applied.error.message);
      applyResults.push(applied.data);
    }
  }

  const autoEvidence = assessed
    .filter(({ assessment }) => assessment.route === "AUTO_EVIDENCE")
    .sort((left, right) => right.assessment.score - left.assessment.score);
  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY_RUN",
        algorithmVersion: CATALOG_RELEVANCE_VERSION,
        assessedCandidates: payload.length,
        selectionHash,
        runId,
        relevanceTiers: counts(assessed.map(({ assessment }) => assessment.tier)),
        automationRoutes: counts(assessed.map(({ assessment }) => assessment.route)),
        routesByCurrentState: counts(
          assessed.map(
            ({ item, assessment }) => `${item.candidateState}:${assessment.route}`,
          ),
        ),
        topAutoEvidenceCandidates: autoEvidence
          .slice(0, 25)
          .map(({ item, assessment }) => ({
            brand: item.brand,
            productName: item.productName,
            category: item.category,
            score: assessment.score,
            reasons: assessment.reasons,
          })),
        applyResults,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Candidate relevance assessment failed.",
  );
  process.exit(1);
});
