import "server-only";
import { rulesetHashMatches, unavailableRuleset } from "@snackcheck/compliance";
import {
  PublishedRulesetSnapshotSchema,
  type PublishedRulesetSnapshot,
} from "@snackcheck/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import { decidePublishedRulesetLoad } from "@/lib/rules/ruleset-load-policy";

export interface PublicRegulatorySource {
  id: string;
  title: string;
  citation: string;
  url: string;
  sourceType: string;
  publishedAt: string | null;
  retrievedAt: string;
}

export function isUsablePublishedRuleset(ruleset: PublishedRulesetSnapshot): boolean {
  return (
    ruleset.isPublished &&
    ruleset.substances.length > 0 &&
    ruleset.rulesetHash.length > 0 &&
    ruleset.id !== "unavailable"
  );
}

function snapshotFromRows(
  ruleset: {
    id: string;
    jurisdiction_id: string;
    code: string;
    version: number;
    title: string;
    effective_from: string;
    effective_until: string | null;
    published_at: string | null;
    is_published: boolean;
    ruleset_hash: string | null;
    freshness_current_days: number;
    freshness_aging_days: number;
  },
  substances: Array<{
    id: string;
    canonical_name: string;
    canonical_normalized: string;
    statutory_ordinal: number;
    regulatory_source_id: string;
    source_locator: string | null;
    enabled: boolean;
  }>,
  aliases: Array<{
    id: string;
    prohibited_substance_id: string;
    alias: string;
    normalized_alias: string;
    match_mode: PublishedRulesetSnapshot["substances"][number]["aliases"][number]["matchMode"];
    review_status: string;
    enabled: boolean;
    regulatory_source_id: string | null;
    pattern?: string | null;
  }>,
  contexts: Array<{
    context: string;
    applicability_status: PublishedRulesetSnapshot["contexts"][number]["applicabilityStatus"];
    regulatory_source_id: string;
    source_locator: string | null;
    public_summary: string;
    enabled: boolean;
  }>,
): PublishedRulesetSnapshot {
  return {
    id: ruleset.id,
    jurisdictionId: ruleset.jurisdiction_id,
    code: ruleset.code,
    version: ruleset.version,
    title: ruleset.title,
    effectiveFrom: ruleset.effective_from,
    effectiveUntil: ruleset.effective_until,
    publishedAt: ruleset.published_at,
    isPublished: ruleset.is_published,
    rulesetHash: ruleset.ruleset_hash ?? "",
    freshnessCurrentDays: ruleset.freshness_current_days,
    freshnessAgingDays: ruleset.freshness_aging_days,
    sourceIds: [...new Set(substances.map((row) => row.regulatory_source_id))],
    substances: substances.map((substance) => ({
      id: substance.id,
      canonicalName: substance.canonical_name,
      canonicalNormalized: substance.canonical_normalized,
      statutoryOrdinal: substance.statutory_ordinal,
      regulatorySourceId: substance.regulatory_source_id,
      sourceLocator: substance.source_locator,
      enabled: substance.enabled,
      aliases: aliases
        .filter(
          (alias) => alias.prohibited_substance_id === substance.id && alias.enabled,
        )
        .flatMap((alias) =>
          alias.review_status === "PENDING_REVIEW" || alias.review_status === "REJECTED"
            ? []
            : [
                {
                  id: alias.id,
                  alias: alias.alias,
                  normalizedAlias: alias.normalized_alias,
                  matchMode: alias.match_mode,
                  reviewStatus:
                    alias.review_status as PublishedRulesetSnapshot["substances"][number]["aliases"][number]["reviewStatus"],
                  enabled: true as const,
                  regulatorySourceId: alias.regulatory_source_id,
                  pattern: alias.pattern ?? undefined,
                },
              ],
        ),
    })),
    contexts: contexts.map((context) => ({
      context: context.context as PublishedRulesetSnapshot["contexts"][number]["context"],
      applicabilityStatus: context.applicability_status,
      regulatorySourceId: context.regulatory_source_id,
      sourceLocator: context.source_locator,
      publicSummary: context.public_summary,
      enabled: context.enabled,
    })),
  };
}

export async function loadPublishedArizonaRuleset(): Promise<PublishedRulesetSnapshot> {
  const admin = createAdminClient();
  const { data: ruleset } = admin
    ? await admin
        .from("rulesets")
        .select("*")
        .eq("code", "AZ-HSA")
        .eq("is_published", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (
    decidePublishedRulesetLoad({
      nodeEnv: process.env.NODE_ENV ?? "development",
      hasAdminClient: Boolean(admin),
      hasPublishedRow: Boolean(ruleset),
    }) !== "use-published" ||
    !admin ||
    !ruleset
  ) {
    return unavailableRuleset();
  }

  const [{ data: substances }, { data: aliases }, { data: contexts }] = await Promise.all(
    [
      admin.from("prohibited_substances").select("*").eq("ruleset_id", ruleset.id),
      admin.from("rule_aliases").select("*").eq("enabled", true),
      admin
        .from("ruleset_contexts")
        .select("*")
        .eq("ruleset_id", ruleset.id)
        .eq("enabled", true),
    ],
  );

  const snapshot = snapshotFromRows(
    ruleset,
    substances ?? [],
    aliases ?? [],
    contexts ?? [],
  );
  const parsed = PublishedRulesetSnapshotSchema.safeParse(snapshot);
  const snapshotValid =
    parsed.success && rulesetHashMatches(snapshot, snapshot.rulesetHash);

  if (
    decidePublishedRulesetLoad({
      nodeEnv: process.env.NODE_ENV ?? "development",
      hasAdminClient: true,
      hasPublishedRow: true,
      snapshotValid,
    }) !== "use-published"
  ) {
    return unavailableRuleset();
  }

  return snapshot;
}

export async function loadArizonaSources(): Promise<PublicRegulatorySource[]> {
  const admin = createAdminClient();
  if (!admin) {
    return [];
  }

  const { data } = await admin
    .from("regulatory_sources")
    .select("*")
    .eq("jurisdiction_id", "22222222-2222-2222-2222-222222222222")
    .eq("active", true)
    .order("published_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    citation: row.citation,
    url: row.url,
    sourceType: row.source_type,
    publishedAt: row.published_at,
    retrievedAt: row.retrieved_at,
  }));
}
