import { describe, expect, it } from "vitest";
import { decidePublishedRulesetLoad } from "../../lib/rules/ruleset-load-policy";

describe("P0-1 production ruleset load", () => {
  it("must not receive the fixture ruleset when the admin client is missing", () => {
    expect(
      decidePublishedRulesetLoad({
        nodeEnv: "production",
        hasAdminClient: false,
        hasPublishedRow: false,
      }),
    ).not.toBe("use-fixture");
  });

  it("must not receive the fixture ruleset when no published row exists", () => {
    expect(
      decidePublishedRulesetLoad({
        nodeEnv: "production",
        hasAdminClient: true,
        hasPublishedRow: false,
      }),
    ).not.toBe("use-fixture");
  });
});
