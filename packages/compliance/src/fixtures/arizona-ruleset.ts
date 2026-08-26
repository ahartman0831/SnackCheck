import type { PublishedRulesetSnapshot } from "@snackcheck/contracts";
import { hashRuleset } from "../hash-ruleset";

const SOURCE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";

function substance(
  id: string,
  name: string,
  ordinal: number,
  aliases: Array<{ id: string; alias: string; normalizedAlias: string }>,
) {
  return {
    id,
    canonicalName: name,
    canonicalNormalized: name.toLowerCase(),
    statutoryOrdinal: ordinal,
    regulatorySourceId: SOURCE,
    sourceLocator: "A.R.S. § 15-242.01",
    enabled: true,
    aliases: aliases.map((alias) => ({
      ...alias,
      matchMode: "TOKEN_SEQUENCE" as const,
      reviewStatus: "EXACT_STATUTE_TERM" as const,
      enabled: true as const,
      regulatorySourceId: SOURCE,
    })),
  };
}

const draft: Omit<PublishedRulesetSnapshot, "rulesetHash"> = {
  id: "33333333-3333-3333-3333-333333333333",
  jurisdictionId: "22222222-2222-2222-2222-222222222222",
  code: "AZ-HSA",
  version: 1,
  title: "Arizona Healthy Schools Act ingredient ruleset",
  effectiveFrom: "2026-07-01",
  effectiveUntil: null,
  publishedAt: "2026-08-26T00:00:00.000Z",
  isPublished: true,
  freshnessCurrentDays: 180,
  freshnessAgingDays: 365,
  sourceIds: [SOURCE],
  contexts: [
    {
      context: "CLASSROOM_DISTRIBUTION",
      applicabilityStatus: "APPLIES",
      regulatorySourceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4",
      sourceLocator: "ADE May 2026 FAQ",
      publicSummary:
        "ADE guidance states that compliance is campus-wide and includes classroom-based food distribution.",
      enabled: true,
    },
    {
      context: "PARENT_OWN_CHILD",
      applicabilityStatus: "PARENT_OWN_CHILD_EXCEPTION",
      regulatorySourceId: SOURCE,
      sourceLocator: "A.R.S. § 15-242.01",
      publicSummary:
        "Arizona's school-day restriction does not prevent a parent or guardian from providing this food to their own student. Your school may still have other policies, including allergy or campus rules.",
      enabled: true,
    },
    {
      context: "SCHOOL_SERVED",
      applicabilityStatus: "APPLIES",
      regulatorySourceId: SOURCE,
      sourceLocator: "A.R.S. § 15-242.01",
      publicSummary:
        "The statute prohibits a participating school from serving covered food on campus during the normal school day.",
      enabled: true,
    },
    {
      context: "UNKNOWN",
      applicabilityStatus: "UNKNOWN",
      regulatorySourceId: SOURCE,
      sourceLocator: "A.R.S. § 15-242.01",
      publicSummary: "The selected context is not resolved by the published sources.",
      enabled: true,
    },
  ],
  substances: [
    substance("s1", "Potassium bromate", 1, [
      { id: "a1", alias: "Potassium bromate", normalizedAlias: "potassium bromate" },
    ]),
    substance("s2", "Propylparaben", 2, [
      { id: "a2", alias: "Propylparaben", normalizedAlias: "propylparaben" },
    ]),
    substance("s3", "Titanium dioxide", 3, [
      { id: "a3", alias: "Titanium dioxide", normalizedAlias: "titanium dioxide" },
    ]),
    substance("s4", "Brominated vegetable oil", 4, [
      {
        id: "a4",
        alias: "Brominated vegetable oil",
        normalizedAlias: "brominated vegetable oil",
      },
    ]),
    substance("s5", "Yellow dye 5", 5, [
      { id: "a5", alias: "Yellow dye 5", normalizedAlias: "yellow dye 5" },
      { id: "a5b", alias: "Yellow dye No. 5", normalizedAlias: "yellow dye no 5" },
    ]),
    substance("s6", "Yellow dye 6", 6, [
      { id: "a6", alias: "Yellow dye 6", normalizedAlias: "yellow dye 6" },
      { id: "a6b", alias: "Yellow dye #6", normalizedAlias: "yellow dye no 6" },
    ]),
    substance("s7", "Blue dye 1", 7, [
      { id: "a7", alias: "Blue dye 1", normalizedAlias: "blue dye 1" },
    ]),
    substance("s8", "Blue dye 2", 8, [
      { id: "a8", alias: "Blue dye 2", normalizedAlias: "blue dye 2" },
    ]),
    substance("s9", "Green dye 3", 9, [
      { id: "a9", alias: "Green dye 3", normalizedAlias: "green dye 3" },
    ]),
    substance("s10", "Red dye 3", 10, [
      { id: "a10", alias: "Red dye 3", normalizedAlias: "red dye 3" },
    ]),
    substance("s11", "Red dye 40", 11, [
      { id: "a11", alias: "Red dye 40", normalizedAlias: "red dye 40" },
      { id: "a11b", alias: "Red dye No. 40", normalizedAlias: "red dye no 40" },
    ]),
  ],
};

export function arizonaRuleset(): PublishedRulesetSnapshot {
  return { ...draft, rulesetHash: hashRuleset(draft as PublishedRulesetSnapshot) };
}

export const PENDING_ALIAS_FIXTURES = [
  { alias: "Allura Red AC", normalizedAlias: "allura red ac", enabled: false },
  { alias: "E129", normalizedAlias: "e129", enabled: false },
  { alias: "Red 40 Lake", normalizedAlias: "red 40 lake", enabled: false },
];
