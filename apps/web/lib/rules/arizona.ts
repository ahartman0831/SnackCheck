import "server-only";
import { arizonaRuleset } from "@snackcheck/compliance";
import type { PublishedRulesetSnapshot } from "@snackcheck/contracts";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicRegulatorySource {
  id: string;
  title: string;
  citation: string;
  url: string;
  sourceType: string;
  publishedAt: string | null;
  retrievedAt: string;
}

export async function loadPublishedArizonaRuleset(): Promise<PublishedRulesetSnapshot> {
  const admin = createAdminClient();
  if (!admin) {
    return arizonaRuleset();
  }

  const { data: ruleset } = await admin
    .from("rulesets")
    .select("*")
    .eq("code", "AZ-HSA")
    .eq("is_published", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ruleset) {
    return arizonaRuleset();
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

  const snapshot: PublishedRulesetSnapshot = {
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
    sourceIds: [...new Set((substances ?? []).map((row) => row.regulatory_source_id))],
    substances: (substances ?? []).map((substance) => ({
      id: substance.id,
      canonicalName: substance.canonical_name,
      canonicalNormalized: substance.canonical_normalized,
      statutoryOrdinal: substance.statutory_ordinal,
      regulatorySourceId: substance.regulatory_source_id,
      sourceLocator: substance.source_locator,
      enabled: substance.enabled,
      aliases: (aliases ?? [])
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
                  reviewStatus: alias.review_status,
                  enabled: true as const,
                  regulatorySourceId: alias.regulatory_source_id,
                },
              ],
        ),
    })),
    contexts: (contexts ?? []).map((context) => ({
      context: context.context as PublishedRulesetSnapshot["contexts"][number]["context"],
      applicabilityStatus: context.applicability_status,
      regulatorySourceId: context.regulatory_source_id,
      sourceLocator: context.source_locator,
      publicSummary: context.public_summary,
      enabled: context.enabled,
    })),
  };

  return snapshot;
}

export async function loadArizonaSources(): Promise<PublicRegulatorySource[]> {
  const admin = createAdminClient();
  if (!admin) {
    return [
      {
        id: "ars",
        title: "A.R.S. § 15-242.01",
        citation: "A.R.S. § 15-242.01",
        url: "https://www.azleg.gov/ars/15/00242-01.htm",
        sourceType: "STATUTE",
        publishedAt: "2025-05-12",
        retrievedAt: "2026-08-25T00:00:00.000Z",
      },
      {
        id: "hb2164",
        title: "Arizona Laws 2025, Chapter 52 / HB 2164",
        citation: "Ariz. Laws 2025, ch. 52",
        url: "https://www.azleg.gov/legtext/57Leg/1R/laws/0052.pdf",
        sourceType: "STATUTE",
        publishedAt: "2025-05-12",
        retrievedAt: "2026-08-25T00:00:00.000Z",
      },
      {
        id: "ade-memo",
        title: "ADE May 5, 2026 compliance memorandum",
        citation: "Arizona Department of Education, May 5, 2026",
        url: "https://www.azed.gov/sites/default/files/2026/05/Arizona%20Healthy%20Schools%20Act.pdf",
        sourceType: "AGENCY_GUIDANCE",
        publishedAt: "2026-05-05",
        retrievedAt: "2026-08-25T00:00:00.000Z",
      },
      {
        id: "ade-faq",
        title: "ADE May 2026 administrator resource and FAQ",
        citation: "Arizona Department of Education, May 2026",
        url: "https://www.azed.gov/sites/default/files/2026/01/The%20Basics%20of%20the%20Arizona%20Healthy%20Schools%20Act%20Resource%20for%20School%20Administrators.pdf",
        sourceType: "AGENCY_GUIDANCE",
        publishedAt: "2026-05-01",
        retrievedAt: "2026-08-25T00:00:00.000Z",
      },
    ];
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
