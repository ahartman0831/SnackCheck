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

export function rulesetHashPayload(
  ruleset: Pick<
    PublishedRulesetSnapshot,
    | "id"
    | "code"
    | "version"
    | "effectiveFrom"
    | "effectiveUntil"
    | "freshnessCurrentDays"
    | "freshnessAgingDays"
    | "contexts"
    | "substances"
  >,
): Record<string, unknown> {
  return {
    code: ruleset.code,
    contexts: ruleset.contexts
      .filter((context) => context.enabled)
      .map((context) => ({
        applicabilityStatus: context.applicabilityStatus,
        context: context.context,
        regulatorySourceId: context.regulatorySourceId,
      }))
      .sort((a, b) => a.context.localeCompare(b.context)),
    effectiveFrom: ruleset.effectiveFrom,
    effectiveUntil: ruleset.effectiveUntil,
    freshnessAgingDays: ruleset.freshnessAgingDays,
    freshnessCurrentDays: ruleset.freshnessCurrentDays,
    id: ruleset.id,
    sourceIds: [
      ...new Set(
        ruleset.substances
          .filter((substance) => substance.enabled)
          .map((substance) => substance.regulatorySourceId),
      ),
    ].sort(),
    substances: ruleset.substances
      .filter((substance) => substance.enabled)
      .map((substance) => ({
        aliases: substance.aliases
          .filter((alias) => alias.enabled)
          .map((alias) => ({
            id: alias.id,
            matchMode: alias.matchMode,
            normalizedAlias: alias.normalizedAlias,
            pattern: alias.pattern ?? null,
          }))
          .sort((a, b) => a.normalizedAlias.localeCompare(b.normalizedAlias)),
        canonicalNormalized: substance.canonicalNormalized,
        id: substance.id,
        statutoryOrdinal: substance.statutoryOrdinal,
      }))
      .sort((a, b) => a.statutoryOrdinal - b.statutoryOrdinal),
    version: ruleset.version,
  };
}

export function hashRuleset(ruleset: PublishedRulesetSnapshot): string {
  return hashCanonicalJson(rulesetHashPayload(ruleset));
}

export function rulesetHashMatches(
  ruleset: PublishedRulesetSnapshot,
  expectedHash: string,
): boolean {
  return expectedHash.length > 0 && hashRuleset(ruleset) === expectedHash;
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
