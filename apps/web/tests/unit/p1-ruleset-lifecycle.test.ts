import { describe, expect, it } from "vitest";
import {
  canPublishRuleset,
  nextDraftVersion,
  publicationBlockers,
} from "../../lib/rules/ruleset-lifecycle";
import { decidePublishedRulesetLoad } from "../../lib/rules/ruleset-load-policy";

const ready = {
  effectiveFrom: "2026-07-01",
  isPublished: false,
  rulesetHash: "abc",
  reviewedBy: "reviewer",
  reviewedAt: "2026-08-26T00:00:00.000Z",
  reviewDocumentUrl: "https://example.test/review",
  reviewDocumentHash: "hash",
  publishedBy: "publisher",
  activePrimarySourceCount: 4,
  enabledSubstanceCount: 11,
  enabledSubstancesHaveProvenance: true,
  enabledAliasesApprovedAndSourced: true,
  enabledContextsHaveProvenance: true,
};

describe("Phase 1 ruleset lifecycle", () => {
  it("blocks publication without signed review or hash", () => {
    expect(
      publicationBlockers({
        ...ready,
        reviewedBy: null,
        reviewedAt: null,
        reviewDocumentUrl: null,
        reviewDocumentHash: null,
        rulesetHash: null,
        publishedBy: null,
      }).length,
    ).toBeGreaterThan(0);
    expect(canPublishRuleset({ ...ready, reviewedBy: null, reviewedAt: null })).toBe(
      false,
    );
  });

  it("allows publish only when review, hash, 11 substances, and provenance are present", () => {
    expect(canPublishRuleset(ready)).toBe(true);
    expect(canPublishRuleset({ ...ready, enabledSubstanceCount: 10 })).toBe(false);
  });

  it("clones to the next draft version without changing the prior version number", () => {
    expect(nextDraftVersion(1)).toBe(2);
  });

  it("treats a missing DB, unpublished row, or invalid hash as unavailable", () => {
    expect(
      decidePublishedRulesetLoad({
        nodeEnv: "production",
        hasAdminClient: false,
        hasPublishedRow: false,
      }),
    ).toBe("unavailable");
    expect(
      decidePublishedRulesetLoad({
        nodeEnv: "development",
        hasAdminClient: true,
        hasPublishedRow: false,
      }),
    ).toBe("unavailable");
    expect(
      decidePublishedRulesetLoad({
        nodeEnv: "production",
        hasAdminClient: true,
        hasPublishedRow: true,
        snapshotValid: false,
      }),
    ).toBe("unavailable");
  });
});
