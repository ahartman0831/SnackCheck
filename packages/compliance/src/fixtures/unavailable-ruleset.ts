import type { PublishedRulesetSnapshot } from "@snackcheck/contracts";

/** Unpublished empty snapshot. Evaluations must VERIFY — never PASS. */
export function unavailableRuleset(): PublishedRulesetSnapshot {
  return {
    id: "unavailable",
    jurisdictionId: "unavailable",
    code: "UNAVAILABLE",
    version: 0,
    title: "Published ruleset unavailable",
    effectiveFrom: "1970-01-01",
    effectiveUntil: null,
    publishedAt: null,
    isPublished: false,
    rulesetHash: "",
    freshnessCurrentDays: 180,
    freshnessAgingDays: 365,
    sourceIds: [],
    substances: [],
    contexts: [],
  };
}
