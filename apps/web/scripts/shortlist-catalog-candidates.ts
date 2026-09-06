import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  assessClassroomRelevance,
  CATALOG_SHORTLIST_VERSION,
  DEFAULT_SHORTLIST_TARGET,
  MAX_SHORTLIST_TARGET,
  selectCatalogShortlist,
  type ShortlistCandidate,
} from "../lib/catalog-candidates/shortlist";
import { assertStagingApplySafety } from "../lib/catalog-candidates/operation-safety";

const APPLY_CONFIRMATION = "QUEUE_CATALOG_SHORTLIST_TO_STAGING";
const PAGE_SIZE = 500;

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

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function parseTarget(argv: string[]): number {
  const value = Number(option(argv, "--target-count") ?? DEFAULT_SHORTLIST_TARGET);
  if (!Number.isInteger(value) || value < 1 || value > MAX_SHORTLIST_TARGET) {
    throw new Error(`--target-count must be between 1 and ${MAX_SHORTLIST_TARGET}.`);
  }
  return value;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapCandidate(row: CandidateRow): ShortlistCandidate {
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

function counts<T extends string>(values: T[]): Record<T, number> {
  return values.reduce(
    (result, value) => ({ ...result, [value]: (result[value] ?? 0) + 1 }),
    {} as Record<T, number>,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const target = parseTarget(argv);
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
      .eq("discontinued", false)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (page.error) throw new Error(page.error.message);
    const pageRows = (page.data ?? []) as CandidateRow[];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  const candidates = rows.map(mapCandidate);
  const assessments = candidates.map((candidate) => ({
    candidate,
    assessment: assessClassroomRelevance(candidate),
  }));
  const shortlist = selectCatalogShortlist(candidates, target);
  if (apply && !shortlist.length) {
    throw new Error("No new high-relevance candidates were available to queue.");
  }

  const selectionHash = createHash("sha256")
    .update(
      `${CATALOG_SHORTLIST_VERSION}\n${shortlist.map((candidate) => candidate.id).join("\n")}`,
    )
    .digest("hex");
  const groupCounts = counts(shortlist.map((candidate) => candidate.group));
  const runId = option(argv, "--run-id") ?? randomUUID();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      runId,
    )
  ) {
    throw new Error("--run-id must be a lowercase UUID.");
  }
  const categoryCounts = counts(
    shortlist.map((candidate) => candidate.category ?? "Uncategorized"),
  );
  const run = {
    algorithmVersion: CATALOG_SHORTLIST_VERSION,
    targetCount: shortlist.length,
    selectionHash,
    groupCounts,
    runId,
  };

  let applyResult: unknown = null;
  if (apply) {
    const rpc = admin.rpc.bind(admin) as unknown as (
      name: "queue_catalog_candidate_shortlist",
      args: {
        p_candidate_ids: string[];
        p_run: typeof run;
        p_confirmation: string;
      },
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
    const queued = await rpc("queue_catalog_candidate_shortlist", {
      p_candidate_ids: shortlist.map((candidate) => candidate.id),
      p_run: run,
      p_confirmation: APPLY_CONFIRMATION,
    });
    if (queued.error) throw new Error(queued.error.message);
    applyResult = queued.data;
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY_RUN",
        sourceCandidates: rows.length,
        requestedCandidates: target,
        selectedCandidates: shortlist.length,
        selectionHash,
        runId,
        groupCounts,
        categoryCounts: Object.fromEntries(
          Object.entries(categoryCounts).sort((left, right) => right[1] - left[1]),
        ),
        uniqueBrands: new Set(shortlist.map((candidate) => candidate.brand)).size,
        relevanceTiers: counts(assessments.map(({ assessment }) => assessment.tier)),
        automationRoutes: counts(assessments.map(({ assessment }) => assessment.route)),
        selectedPreview: shortlist.slice(0, 20).map((candidate) => ({
          brand: candidate.brand,
          productName: candidate.productName,
          category: candidate.category,
          score: candidate.relevance.score,
          tier: candidate.relevance.tier,
          route: candidate.relevance.route,
        })),
        applyResult,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Shortlist generation failed.");
  process.exit(1);
});
