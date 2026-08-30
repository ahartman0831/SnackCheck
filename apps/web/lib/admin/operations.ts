import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

const REVIEW_ROLES = ["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"] as const;
const PENDING_STATES = [
  "SANITIZED",
  "NEEDS_CONFIRMATION",
  "EVALUATED",
  "REVIEW_PENDING",
] as const;

export type OperationsSnapshot = {
  role: (typeof REVIEW_ROLES)[number];
  generatedAt: string;
  metrics: {
    pendingSubmissions: number;
    lowConfidenceExtractions: number;
    productConflicts: number;
    staleFormulations: number;
    failedProviderCalls: number;
    zeroResultSearches: number;
    unknownGtins: number;
    aiCalls30d: number;
    aiSpend30dUsd: number;
    averageLatencyMs: number | null;
    oldestQueueItemAt: string | null;
  };
  recentSubmissions: Array<{
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    confidence: number | null;
    failureCode: string | null;
    hasGtin: boolean;
  }>;
  recentProviderCalls: Array<{
    occurredAt: string;
    provider: string;
    model: string;
    outcome: string;
    latencyMs: number;
    estimatedCostUsd: number | null;
  }>;
  recentRulesets: Array<{
    id: string;
    code: string;
    version: number;
    published: boolean;
    createdAt: string;
  }>;
};

function countOf(result: { count: number | null }): number {
  return result.count ?? 0;
}

export async function getOperationsSnapshot(): Promise<OperationsSnapshot | null> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed || !auth.role) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const staleBefore = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const [
    pending,
    lowConfidence,
    conflicts,
    stale,
    failedCalls,
    zeroResults,
    unknownGtins,
    oldest,
    submissions,
    usage,
    rulesets,
  ] = await Promise.all([
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("status", [...PENDING_STATES]),
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .lt("extraction_confidence", 0.8),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("formulation_conflict", true),
    admin
      .from("formulations")
      .select("id", { count: "exact", head: true })
      .or(`last_verified_at.is.null,last_verified_at.lt.${staleBefore}`),
    admin
      .from("extraction_attempts")
      .select("id", { count: "exact", head: true })
      .in("outcome", ["ERROR", "TIMEOUT", "INVALID"])
      .gte("created_at", thirtyDaysAgo),
    admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "search_zero_results")
      .gte("occurred_at", thirtyDaysAgo),
    admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "barcode_unknown")
      .gte("occurred_at", thirtyDaysAgo),
    admin
      .from("submissions")
      .select("created_at")
      .in("status", [...PENDING_STATES])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("submissions")
      .select(
        "id,status,created_at,updated_at,extraction_confidence,failure_code,normalized_gtin14",
      )
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("ai_usage_ledger")
      .select("occurred_at,provider,model,outcome,latency_ms,estimated_total_cost_usd")
      .gte("occurred_at", thirtyDaysAgo)
      .order("occurred_at", { ascending: false })
      .limit(1000),
    admin
      .from("rulesets")
      .select("id,code,version,is_published,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const results = [
    pending,
    lowConfidence,
    conflicts,
    stale,
    failedCalls,
    zeroResults,
    unknownGtins,
    oldest,
    submissions,
    usage,
    rulesets,
  ];
  if (results.some((result) => result.error))
    throw new Error("The operations dashboard could not be loaded.");
  const usageRows = usage.data ?? [];
  const spend = usageRows.reduce(
    (total, row) => total + Number(row.estimated_total_cost_usd ?? 0),
    0,
  );
  const latency = usageRows.length
    ? Math.round(
        usageRows.reduce((total, row) => total + row.latency_ms, 0) / usageRows.length,
      )
    : null;

  return {
    role: auth.role,
    generatedAt: new Date().toISOString(),
    metrics: {
      pendingSubmissions: countOf(pending),
      lowConfidenceExtractions: countOf(lowConfidence),
      productConflicts: countOf(conflicts),
      staleFormulations: countOf(stale),
      failedProviderCalls: countOf(failedCalls),
      zeroResultSearches: countOf(zeroResults),
      unknownGtins: countOf(unknownGtins),
      aiCalls30d: usageRows.length,
      aiSpend30dUsd: spend,
      averageLatencyMs: latency,
      oldestQueueItemAt: oldest.data?.created_at ?? null,
    },
    recentSubmissions: (submissions.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      confidence: row.extraction_confidence,
      failureCode: row.failure_code,
      hasGtin: Boolean(row.normalized_gtin14),
    })),
    recentProviderCalls: usageRows.slice(0, 12).map((row) => ({
      occurredAt: row.occurred_at,
      provider: row.provider,
      model: row.model,
      outcome: row.outcome,
      latencyMs: row.latency_ms,
      estimatedCostUsd:
        row.estimated_total_cost_usd === null
          ? null
          : Number(row.estimated_total_cost_usd),
    })),
    recentRulesets: (rulesets.data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      version: row.version,
      published: row.is_published,
      createdAt: row.created_at,
    })),
  };
}
