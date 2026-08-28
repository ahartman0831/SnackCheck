import { describe, expect, it } from "vitest";
import {
  freshnessState,
  isApprovedEligible,
} from "../../lib/products/approved-eligibility";

const currentHash = "published-hash";

describe("approved-query eligibility", () => {
  it("requires a current published ruleset hash, PASS, confirmed evidence, and CURRENT freshness", () => {
    expect(
      isApprovedEligible({
        ingredientStatus: "PASS",
        verificationStatus: "VERIFIED",
        freshnessState: "CURRENT",
        formulationConflict: false,
        rulesetHash: currentHash,
        currentPublishedRulesetHash: currentHash,
      }),
    ).toBe(true);
  });

  it("returns no approved products when no valid published ruleset exists", () => {
    expect(
      isApprovedEligible({
        ingredientStatus: "PASS",
        verificationStatus: "VERIFIED",
        freshnessState: "CURRENT",
        formulationConflict: false,
        rulesetHash: currentHash,
        currentPublishedRulesetHash: null,
      }),
    ).toBe(false);
  });

  it("excludes stale, conflicted, community-only, rejected, and external-only evidence", () => {
    const base = {
      ingredientStatus: "PASS" as const,
      freshnessState: "CURRENT" as const,
      formulationConflict: false,
      rulesetHash: currentHash,
      currentPublishedRulesetHash: currentHash,
    };
    expect(isApprovedEligible({ ...base, verificationStatus: "STALE" })).toBe(false);
    expect(
      isApprovedEligible({
        ...base,
        verificationStatus: "VERIFIED",
        formulationConflict: true,
      }),
    ).toBe(false);
    expect(
      isApprovedEligible({ ...base, verificationStatus: "COMMUNITY_SUBMITTED" }),
    ).toBe(false);
    expect(isApprovedEligible({ ...base, verificationStatus: "REJECTED" })).toBe(false);
    expect(isApprovedEligible({ ...base, verificationStatus: "EXTERNAL_DATABASE" })).toBe(
      false,
    );
    expect(
      isApprovedEligible({
        ...base,
        verificationStatus: "VERIFIED",
        freshnessState: "STALE",
      }),
    ).toBe(false);
    expect(
      isApprovedEligible({
        ...base,
        verificationStatus: "VERIFIED",
        ingredientStatus: "VERIFY",
      }),
    ).toBe(false);
  });

  it("classifies freshness from last verified date", () => {
    expect(
      freshnessState({
        lastVerifiedAt: "2026-08-01T00:00:00.000Z",
        evaluationDate: "2026-08-26",
        freshnessCurrentDays: 180,
        freshnessAgingDays: 365,
      }),
    ).toBe("CURRENT");
    expect(
      freshnessState({
        lastVerifiedAt: "2026-01-01T00:00:00.000Z",
        evaluationDate: "2026-08-26",
        freshnessCurrentDays: 180,
        freshnessAgingDays: 365,
      }),
    ).toBe("AGING");
    expect(
      freshnessState({
        lastVerifiedAt: null,
        evaluationDate: "2026-08-26",
        freshnessCurrentDays: 180,
        freshnessAgingDays: 365,
      }),
    ).toBe("STALE");
  });
});
