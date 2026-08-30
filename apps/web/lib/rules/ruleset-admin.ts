import "server-only";
import type { Database } from "@snackcheck/db-types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserServerClient } from "@/lib/supabase/server";

const REGULATORY_ROLES = ["REGULATORY_ADMIN", "SUPER_ADMIN"] as const;

export type RulesetOperationRecord = {
  id: string;
  code: string;
  version: number;
  title: string;
  effectiveFrom: string;
  published: boolean;
  publishedAt: string | null;
  rulesetHash: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewDocumentUrl: string | null;
  reviewDocumentHash: string | null;
  blockers: string[];
};

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function listRulesetOperations(): Promise<{
  actorId: string;
  rulesets: RulesetOperationRecord[];
} | null> {
  const auth = await requireAdmin([...REGULATORY_ROLES]);
  if (!auth.allowed || !auth.user) return null;
  const client = createAdminClient();
  if (!client) return null;
  const rulesets = await client
    .from("rulesets")
    .select(
      "id,code,version,title,effective_from,is_published,published_at,ruleset_hash,reviewed_by,reviewed_at,review_document_url,review_document_hash",
    )
    .order("code")
    .order("version", { ascending: false });
  if (rulesets.error) throw new Error("The ruleset operations list could not be loaded.");
  const withBlockers = await Promise.all(
    (rulesets.data ?? []).map(async (row) => {
      const result = await client.rpc("ruleset_publication_blockers", {
        target_ruleset_id: row.id,
      });
      if (result.error)
        throw new Error("Ruleset publication checks could not be loaded.");
      return {
        id: row.id,
        code: row.code,
        version: row.version,
        title: row.title,
        effectiveFrom: row.effective_from,
        published: row.is_published,
        publishedAt: row.published_at,
        rulesetHash: row.ruleset_hash,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        reviewDocumentUrl: safeHttpsUrl(row.review_document_url),
        reviewDocumentHash: row.review_document_hash,
        blockers: result.data ?? [],
      };
    }),
  );
  return { actorId: auth.user.id, rulesets: withBlockers };
}

async function signedInClient() {
  const value = await createUserServerClient();
  if (!value) throw new Error("The signed-in admin service is unavailable.");
  return value;
}

export async function cloneRulesetToDraft(input: {
  sourceRulesetId: string;
  expectedHash: string;
  requestId: string;
}): Promise<string> {
  const client = await signedInClient();
  type Args = Database["public"]["Functions"]["admin_clone_ruleset_to_draft"]["Args"];
  const clone = client.rpc.bind(client) as unknown as (
    name: "admin_clone_ruleset_to_draft",
    args: Args,
  ) => PromiseLike<{ data: string | null; error: unknown | null }>;
  const result = await clone("admin_clone_ruleset_to_draft", {
    p_source_ruleset_id: input.sourceRulesetId,
    p_expected_hash: input.expectedHash,
    p_request_id: input.requestId,
  });
  if (result.error || !result.data)
    throw result.error ?? new Error("Ruleset clone failed.");
  return result.data;
}

export async function reviewRuleset(input: {
  rulesetId: string;
  expectedHash: string;
  reviewDocumentUrl: string;
  reviewDocumentHash: string;
  requestId: string;
}): Promise<void> {
  const client = await signedInClient();
  type Args = Database["public"]["Functions"]["admin_review_ruleset"]["Args"];
  const review = client.rpc.bind(client) as unknown as (
    name: "admin_review_ruleset",
    args: Args,
  ) => PromiseLike<{ data: unknown; error: unknown | null }>;
  const result = await review("admin_review_ruleset", {
    p_ruleset_id: input.rulesetId,
    p_expected_hash: input.expectedHash,
    p_document_url: input.reviewDocumentUrl,
    p_document_hash: input.reviewDocumentHash,
    p_request_id: input.requestId,
  });
  if (result.error) throw result.error;
}

export async function publishRuleset(input: {
  rulesetId: string;
  expectedHash: string;
  expectedReviewedAt: string;
  requestId: string;
}): Promise<void> {
  const client = await signedInClient();
  type Args = Database["public"]["Functions"]["admin_publish_ruleset"]["Args"];
  const publish = client.rpc.bind(client) as unknown as (
    name: "admin_publish_ruleset",
    args: Args,
  ) => PromiseLike<{ data: unknown; error: unknown | null }>;
  const result = await publish("admin_publish_ruleset", {
    p_ruleset_id: input.rulesetId,
    p_expected_hash: input.expectedHash,
    p_expected_reviewed_at: input.expectedReviewedAt,
    p_request_id: input.requestId,
  });
  if (result.error) throw result.error;
}
