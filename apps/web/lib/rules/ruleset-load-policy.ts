export type RulesetLoadDecision = "use-published" | "use-fixture" | "unavailable";

/**
 * Production and development both fail closed. A missing admin client,
 * unpublished row, or invalid snapshot must not fall back to the fixture.
 */
export function decidePublishedRulesetLoad(input: {
  nodeEnv: string;
  hasAdminClient: boolean;
  hasPublishedRow: boolean;
  snapshotValid?: boolean;
}): RulesetLoadDecision {
  if (!input.hasAdminClient || !input.hasPublishedRow || input.snapshotValid === false) {
    return "unavailable";
  }
  return "use-published";
}
