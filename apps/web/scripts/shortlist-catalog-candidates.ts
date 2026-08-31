import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  CATALOG_SHORTLIST_VERSION,
  DEFAULT_SHORTLIST_TARGET,
  MAX_SHORTLIST_TARGET,
  selectCatalogShortlist,
  type ShortlistCandidate,
} from "../lib/catalog-candidates/shortlist";

const APPLY_CONFIRMATION = "QUEUE_CATALOG_SHORTLIST_TO_STAGING";

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

function projectRefFromUrl(value: string): string {
  const hostname = new URL(value).hostname;
  const suffix = ".supabase.co";
  if (!hostname.endsWith(suffix)) throw new Error("The Supabase URL is invalid.");
  return hostname.slice(0, -suffix.length);
}

function assertApplySafety(argv: string[], url: string): void {
  if (option(argv, "--target") !== "staging") {
    throw new Error("Apply requires --target staging.");
  }
  if (option(argv, "--confirm") !== APPLY_CONFIRMATION) {
    throw new Error(`Apply requires --confirm ${APPLY_CONFIRMATION}.`);
  }
  const projectRef = projectRefFromUrl(url);
  const designated = process.env.CATALOG_STAGING_SUPABASE_PROJECT_REF ?? "";
  const configured = process.env.SUPABASE_PROJECT_ID ?? "";
  if (!designated || designated !== projectRef || configured !== projectRef) {
    throw new Error(
      "Apply requires both staging project references to match the target URL.",
    );
  }
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
  if (apply) assertApplySafety(argv, url);

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const result = await admin
    .from("catalog_source_records")
    .select(
      "id,brand,product_name,category,variant,size,normalized_gtin14,source_modified_at,source_published_at,quality_flags,screen_status,candidate_state,discontinued",
    )
    .eq("candidate_state", "SCREENED_PASS")
    .eq("screen_status", "PASS")
    .eq("discontinued", false)
    .limit(1000);
  if (result.error) throw new Error(result.error.message);
  const shortlist = selectCatalogShortlist(
    ((result.data ?? []) as CandidateRow[]).map(mapCandidate),
    target,
  );
  if (shortlist.length !== target) {
    throw new Error(
      `Only ${shortlist.length} eligible school-use candidates were available for a target of ${target}.`,
    );
  }

  const selectionHash = createHash("sha256")
    .update(
      `${CATALOG_SHORTLIST_VERSION}\n${shortlist.map((candidate) => candidate.id).join("\n")}`,
    )
    .digest("hex");
  const groupCounts = counts(shortlist.map((candidate) => candidate.group));
  const categoryCounts = counts(
    shortlist.map((candidate) => candidate.category ?? "Uncategorized"),
  );
  const run = {
    algorithmVersion: CATALOG_SHORTLIST_VERSION,
    targetCount: target,
    selectionHash,
    groupCounts,
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
        sourceCandidates: result.data?.length ?? 0,
        selectedCandidates: shortlist.length,
        selectionHash,
        groupCounts,
        categoryCounts: Object.fromEntries(
          Object.entries(categoryCounts).sort((left, right) => right[1] - left[1]),
        ),
        uniqueBrands: new Set(shortlist.map((candidate) => candidate.brand)).size,
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
