import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function cloneRulesetToDraft(sourceRulesetId: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Admin client is required to clone a ruleset.");
  }
  const { data, error } = await admin.rpc("clone_ruleset_to_draft", {
    source_ruleset_id: sourceRulesetId,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Ruleset clone failed.");
  }
  return data;
}

export async function reviewRuleset(input: {
  rulesetId: string;
  reviewerId: string;
  reviewDocumentUrl: string;
  reviewDocumentHash: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Admin client is required to record a ruleset review.");
  }
  const { error } = await admin.rpc("review_ruleset", {
    target_ruleset_id: input.rulesetId,
    reviewer_id: input.reviewerId,
    document_url: input.reviewDocumentUrl,
    document_hash: input.reviewDocumentHash,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function publishRuleset(input: {
  rulesetId: string;
  publisherId: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Admin client is required to publish a ruleset.");
  }
  const { error } = await admin.rpc("publish_ruleset", {
    target_ruleset_id: input.rulesetId,
    publisher_id: input.publisherId,
  });
  if (error) {
    throw new Error(error.message);
  }
}
