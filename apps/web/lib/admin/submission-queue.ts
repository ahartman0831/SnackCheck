import "server-only";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const REVIEW_ROLES = ["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"] as const;
const PENDING_STATES = [
  "SANITIZED",
  "NEEDS_CONFIRMATION",
  "EVALUATED",
  "REVIEW_PENDING",
] as const;
const TERMINAL_STATES = ["APPROVED", "REJECTED", "FAILED", "CANCELLED"] as const;

export type SubmissionQueueFilters = {
  state: "all" | "pending" | "terminal";
  attention: "all" | "needs-review" | "low-confidence" | "failed";
  order: "oldest" | "newest";
  query: string;
};

export type SubmissionQueueItem = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  confidence: number | null;
  failureCode: string | null;
  gtin14: string | null;
};

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseSubmissionQueueFilters(
  values: Record<string, string | string[] | undefined>,
): SubmissionQueueFilters {
  const state = single(values.state);
  const attention = single(values.attention);
  const order = single(values.order);
  return {
    state: state === "pending" || state === "terminal" ? state : "all",
    attention:
      attention === "needs-review" ||
      attention === "low-confidence" ||
      attention === "failed"
        ? attention
        : "all",
    order: order === "oldest" ? "oldest" : "newest",
    query: single(values.query).trim().slice(0, 64),
  };
}

export async function listSubmissionQueue(
  filters: SubmissionQueueFilters,
): Promise<SubmissionQueueItem[] | null> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  let query = admin
    .from("submissions")
    .select(
      "id,status,created_at,updated_at,extraction_confidence,failure_code,normalized_gtin14",
    );

  if (filters.state === "pending") query = query.in("status", [...PENDING_STATES]);
  if (filters.state === "terminal") query = query.in("status", [...TERMINAL_STATES]);
  if (filters.attention === "needs-review")
    query = query.in("status", ["EVALUATED", "REVIEW_PENDING"]);
  if (filters.attention === "low-confidence")
    query = query.lt("extraction_confidence", 0.8);
  if (filters.attention === "failed") query = query.not("failure_code", "is", null);

  if (filters.query) {
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(filters.query)) {
      query = query.eq("id", filters.query);
    } else if (/^\d{8,14}$/.test(filters.query)) {
      query = query.eq("normalized_gtin14", filters.query.padStart(14, "0"));
    } else {
      return [];
    }
  }

  const result = await query
    .order("created_at", { ascending: filters.order === "oldest" })
    .limit(50);
  if (result.error) throw new Error("The submission queue could not be loaded.");

  return (result.data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confidence: row.extraction_confidence,
    failureCode: row.failure_code,
    gtin14: row.normalized_gtin14,
  }));
}
