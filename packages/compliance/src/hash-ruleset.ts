import { createHash } from "node:crypto";
import type { FormulationInput, PublishedRulesetSnapshot } from "@snackcheck/contracts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function hashCanonicalJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));
  return createHash("sha256").update(serialized).digest("hex");
}

export function hashFormulation(
  formulation: Pick<FormulationInput, "rawIngredients" | "ingredients">,
): string {
  return hashCanonicalJson({
    rawIngredients: formulation.rawIngredients,
    ingredients: formulation.ingredients.map((ingredient) => ({
      ordinal: ingredient.ordinal,
      normalized: ingredient.normalized,
      presenceKind: ingredient.presenceKind,
    })),
  });
}

export function hashRuleset(ruleset: PublishedRulesetSnapshot): string {
  return hashCanonicalJson({
    id: ruleset.id,
    code: ruleset.code,
    version: ruleset.version,
    effectiveFrom: ruleset.effectiveFrom,
    effectiveUntil: ruleset.effectiveUntil,
    freshnessCurrentDays: ruleset.freshnessCurrentDays,
    freshnessAgingDays: ruleset.freshnessAgingDays,
    sourceIds: [...ruleset.sourceIds].sort(),
    contexts: ruleset.contexts
      .filter((context) => context.enabled)
      .map((context) => ({
        context: context.context,
        applicabilityStatus: context.applicabilityStatus,
        regulatorySourceId: context.regulatorySourceId,
      }))
      .sort((a, b) => a.context.localeCompare(b.context)),
    substances: ruleset.substances
      .filter((substance) => substance.enabled)
      .map((substance) => ({
        id: substance.id,
        canonicalNormalized: substance.canonicalNormalized,
        statutoryOrdinal: substance.statutoryOrdinal,
        aliases: substance.aliases
          .filter((alias) => alias.enabled)
          .map((alias) => ({
            id: alias.id,
            normalizedAlias: alias.normalizedAlias,
            matchMode: alias.matchMode,
            pattern: alias.pattern ?? null,
          }))
          .sort((a, b) => a.normalizedAlias.localeCompare(b.normalizedAlias)),
      }))
      .sort((a, b) => a.statutoryOrdinal - b.statutoryOrdinal),
  });
}

export function hashEvaluationKey(input: {
  formulationHash: string;
  rulesetHash: string;
  context: string;
  evaluationDate: string;
  engineVersion: string;
}): string {
  return hashCanonicalJson(input);
}
