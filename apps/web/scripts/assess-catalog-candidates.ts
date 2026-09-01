import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  assessClassroomRelevance,
  CATALOG_RELEVANCE_VERSION,
  type ShortlistCandidate,
} from "../lib/catalog-candidates/shortlist";

const APPLY_CONFIRMATION = "APPLY_CLASSROOM_RELEVANCE_TO_STAGING";

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
  if (apply) assertApplySafety(argv, url);

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const result = await admin
    .from("catalog_source_records")
    .select(
      "id,brand,product_name,category,variant,size,normalized_gtin14,source_modified_at,source_published_at,quality_flags,screen_status,candidate_state,discontinued",
    )
    .limit(1000);
  if (result.error) throw new Error(result.error.message);
  const assessed = ((result.data ?? []) as CandidateRow[])
    .map(candidate)
    .map((item) => ({ item, assessment: assessClassroomRelevance(item) }))
    .sort((left, right) => left.item.id.localeCompare(right.item.id));
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
  const run = {
    algorithmVersion: CATALOG_RELEVANCE_VERSION,
    assessedCount: payload.length,
    selectionHash,
  };

  let applyResult: unknown = null;
  if (apply) {
    const rpc = admin.rpc.bind(admin) as unknown as (
      name: "apply_catalog_relevance_assessments",
      args: {
        p_assessments: typeof payload;
        p_run: typeof run;
        p_confirmation: string;
      },
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
    const applied = await rpc("apply_catalog_relevance_assessments", {
      p_assessments: payload,
      p_run: run,
      p_confirmation: APPLY_CONFIRMATION,
    });
    if (applied.error) throw new Error(applied.error.message);
    applyResult = applied.data;
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
        applyResult,
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
