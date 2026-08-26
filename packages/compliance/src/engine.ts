import type {
  ApplicabilityStatus,
  ComplianceInput,
  ComplianceResult,
  LocalPolicyStatus,
  QualityFlag,
} from "@snackcheck/contracts";
import {
  INGREDIENT_STATUS_LABELS,
  LOCAL_RULES_DISCLAIMER,
  PARENT_OWN_CHILD_DISCLAIMER,
} from "@snackcheck/contracts";
import { ENGINE_VERSION } from "./version";
import { matchRules } from "./match";
import { applyQualityGates, rulesetAllowsMatching } from "./quality-gates";

function resolveApplicability(input: ComplianceInput): ApplicabilityStatus {
  const row = input.ruleset.contexts.find(
    (context) => context.enabled && context.context === input.context,
  );
  return row?.applicabilityStatus ?? "UNKNOWN";
}

function resolveLocalPolicy(input: ComplianceInput): LocalPolicyStatus {
  return input.schoolContext?.localPolicyStatus ?? "NOT_REQUESTED";
}

function contextSummary(
  input: ComplianceInput,
  applicability: ApplicabilityStatus,
): string {
  const row = input.ruleset.contexts.find(
    (context) => context.enabled && context.context === input.context,
  );
  if (row) {
    return row.publicSummary;
  }
  if (applicability === "PARENT_OWN_CHILD_EXCEPTION") {
    return PARENT_OWN_CHILD_DISCLAIMER;
  }
  return "Applicability for this context is not resolved by the published ruleset.";
}

function localPolicySummary(input: ComplianceInput, status: LocalPolicyStatus): string {
  if (input.schoolContext?.localPolicySummary) {
    return input.schoolContext.localPolicySummary;
  }
  if (status === "NO_VERIFIED_POLICY" || status === "NOT_REQUESTED") {
    return "School participation not verified.";
  }
  return LOCAL_RULES_DISCLAIMER;
}

export function evaluateCompliance(input: ComplianceInput): ComplianceResult {
  const qualityFlags: QualityFlag[] = applyQualityGates(input);
  const canMatch = rulesetAllowsMatching(input);
  const matches = canMatch
    ? matchRules(input.formulation.ingredients, input.ruleset.substances)
    : [];

  const declaredMatches = matches.filter((match) => !match.precautionary);
  const precautionaryMatches = matches.filter((match) => match.precautionary);

  let ingredientStatus: ComplianceResult["ingredientStatus"] = "VERIFY";
  if (declaredMatches.length > 0) {
    ingredientStatus = "FAIL";
  } else if (precautionaryMatches.length > 0) {
    ingredientStatus = "VERIFY";
    if (!qualityFlags.includes("PRECAUTIONARY_MATCH_ONLY")) {
      qualityFlags.push("PRECAUTIONARY_MATCH_ONLY");
    }
  } else if (qualityFlags.filter((flag) => flag !== "AGING_EVIDENCE").length === 0) {
    ingredientStatus = "PASS";
  } else {
    ingredientStatus = "VERIFY";
  }

  const applicabilityStatus = resolveApplicability(input);
  const localPolicyStatus = resolveLocalPolicy(input);
  const headline = INGREDIENT_STATUS_LABELS[ingredientStatus];

  const summary =
    ingredientStatus === "FAIL"
      ? `This package lists ${declaredMatches
          .map((match) => match.canonicalName)
          .filter((name, index, all) => all.indexOf(name) === index)
          .join(", ")}.`
      : ingredientStatus === "PASS"
        ? "No enabled Arizona prohibited ingredient matched this formulation, and the evidence meets the current quality gates."
        : "A trustworthy current determination is not possible from the available evidence.";

  return {
    ingredientStatus,
    applicabilityStatus,
    localPolicyStatus,
    matchedRules: matches,
    qualityFlags,
    rulesetHash: input.ruleset.rulesetHash,
    formulationHash: input.formulation.hash,
    engineVersion: ENGINE_VERSION,
    evaluatedAt: `${input.evaluationDate}T00:00:00.000Z`,
    explanation: {
      headline,
      summary,
      contextSummary: contextSummary(input, applicabilityStatus),
      localPolicySummary: localPolicySummary(input, localPolicyStatus),
    },
  };
}
