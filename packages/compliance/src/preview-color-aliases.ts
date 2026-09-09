import type { PublishedRulesetSnapshot } from "@snackcheck/contracts";
import { FDA_COLOR_ALIASES, FDA_COLOR_SOURCE_ID } from "./fda-color-aliases";
import { hashRuleset, rulesetHashMatches } from "./hash-ruleset";
import { matchRules } from "./match";
import { parseIngredients } from "./parse-ingredients";

/** Review-only counterfactual. Never returns an approval or a publishable snapshot. */
export function previewColorAliases(
  rawIngredients: string,
  draft: PublishedRulesetSnapshot,
) {
  if (draft.isPublished || !rulesetHashMatches(draft, draft.rulesetHash)) {
    throw new Error("Alias preview requires a valid unpublished draft snapshot");
  }
  const proposed = {
    ...draft,
    substances: draft.substances.map((substance) => ({
      ...substance,
      aliases: [
        ...substance.aliases,
        ...FDA_COLOR_ALIASES.filter(
          (alias) =>
            alias.canonicalName === substance.canonicalName &&
            !substance.aliases.some(
              (existing) => existing.normalizedAlias === alias.normalizedAlias,
            ),
        ).map((alias) => ({
          id: alias.id,
          alias: alias.alias,
          normalizedAlias: alias.normalizedAlias,
          matchMode: "EXACT_SEGMENT" as const,
          reviewStatus: "AUTHORITATIVE_SYNONYM" as const,
          enabled: true as const,
          regulatorySourceId: FDA_COLOR_SOURCE_ID,
        })),
      ],
    })),
  };
  const parsed = parseIngredients(rawIngredients);
  return {
    reviewOnly: true as const,
    baseRulesetHash: draft.rulesetHash,
    proposedRulesetHash: hashRuleset(proposed),
    currentMatches: matchRules(parsed.ingredients, draft.substances),
    proposedMatches: matchRules(parsed.ingredients, proposed.substances),
    parserWarnings: parsed.warnings,
  };
}
