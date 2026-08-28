import {
  APPROVED_VERIFICATION_STATUSES,
  UNCONFIRMED_VERIFICATION_STATUSES,
  type FreshnessState,
  type PublicProductCard,
  type VerificationStatus,
} from "@snackcheck/contracts";

const APPROVED = new Set<string>(APPROVED_VERIFICATION_STATUSES);
const UNCONFIRMED = new Set<string>(UNCONFIRMED_VERIFICATION_STATUSES);

export function freshnessState(input: {
  lastVerifiedAt: string | null;
  evaluationDate: string;
  freshnessCurrentDays: number;
  freshnessAgingDays: number;
}): FreshnessState {
  if (!input.lastVerifiedAt) {
    return "STALE";
  }
  const last = Date.parse(input.lastVerifiedAt);
  const now = Date.parse(input.evaluationDate);
  if (Number.isNaN(last) || Number.isNaN(now)) {
    return "UNKNOWN";
  }
  const ageDays = Math.floor((now - last) / 86_400_000);
  if (ageDays > input.freshnessAgingDays) {
    return "STALE";
  }
  if (ageDays > input.freshnessCurrentDays) {
    return "AGING";
  }
  return "CURRENT";
}

export function isApprovedEligible(input: {
  ingredientStatus: PublicProductCard["ingredientStatus"];
  verificationStatus: VerificationStatus | null;
  freshnessState: FreshnessState;
  formulationConflict: boolean;
  rulesetHash: string | null;
  currentPublishedRulesetHash: string | null;
}): boolean {
  if (!input.currentPublishedRulesetHash) {
    return false;
  }
  if (input.rulesetHash !== input.currentPublishedRulesetHash) {
    return false;
  }
  if (input.ingredientStatus !== "PASS") {
    return false;
  }
  if (input.formulationConflict) {
    return false;
  }
  if (!input.verificationStatus || UNCONFIRMED.has(input.verificationStatus)) {
    return false;
  }
  if (!APPROVED.has(input.verificationStatus)) {
    return false;
  }
  if (input.freshnessState !== "CURRENT") {
    return false;
  }
  return true;
}
