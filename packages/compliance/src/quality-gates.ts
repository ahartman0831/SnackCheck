import type {
  ComplianceInput,
  QualityFlag,
  VerificationStatus,
} from "@snackcheck/contracts";

const UNCONFIRMED: VerificationStatus[] = [
  "CONFLICT",
  "STALE",
  "REJECTED",
  "COMMUNITY_SUBMITTED",
  "EXTERNAL_DATABASE",
];

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor((to - from) / 86_400_000);
}

function rulesetIsEffective(input: ComplianceInput): boolean {
  if (!input.ruleset.isPublished) {
    return false;
  }
  const evaluation = Date.parse(input.evaluationDate);
  const from = Date.parse(input.ruleset.effectiveFrom);
  if (Number.isNaN(evaluation) || Number.isNaN(from) || evaluation < from) {
    return false;
  }
  if (input.ruleset.effectiveUntil) {
    const until = Date.parse(input.ruleset.effectiveUntil);
    if (!Number.isNaN(until) && evaluation > until) {
      return false;
    }
  }
  return true;
}

export function applyQualityGates(input: ComplianceInput): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const { formulation, ruleset } = input;

  if (!formulation.rawIngredients.trim() || formulation.ingredients.length === 0) {
    flags.push("NO_FORMULATION");
    flags.push("INCOMPLETE_INGREDIENTS");
  } else if (
    formulation.ingredients.length < 2 &&
    formulation.rawIngredients.length < 12
  ) {
    flags.push("INCOMPLETE_INGREDIENTS");
  }

  if (formulation.conflict) {
    flags.push("ACTIVE_CONFLICT");
  }

  if (UNCONFIRMED.includes(formulation.verificationStatus)) {
    flags.push("UNCONFIRMED_EVIDENCE");
  }

  if (formulation.verificationStatus === "STALE") {
    flags.push("STALE_EVIDENCE");
  }

  if (formulation.lastVerifiedAt) {
    const age = daysBetween(formulation.lastVerifiedAt, input.evaluationDate);
    if (age > ruleset.freshnessAgingDays) {
      flags.push("STALE_EVIDENCE");
    } else if (age > ruleset.freshnessCurrentDays) {
      flags.push("AGING_EVIDENCE");
    }
  }

  if (formulation.confidence !== null && formulation.confidence < 0.72) {
    flags.push("LOW_CONFIDENCE");
  }

  const lowSpan = formulation.ingredients.some(
    (ingredient) =>
      typeof (ingredient as { parserConfidence?: number }).parserConfidence ===
        "number" &&
      ((ingredient as { parserConfidence?: number }).parserConfidence ?? 1) < 0.72,
  );
  if (lowSpan) {
    flags.push("LOW_SPAN_CONFIDENCE");
  }

  if (!rulesetIsEffective(input) || ruleset.substances.length === 0) {
    flags.push("RULESET_UNAVAILABLE");
  }

  return flags;
}

export function rulesetAllowsMatching(input: ComplianceInput): boolean {
  return !applyQualityGates(input).includes("RULESET_UNAVAILABLE");
}
