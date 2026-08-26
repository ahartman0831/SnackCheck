import type {
  ComplianceMatch,
  EnabledAlias,
  ParsedIngredient,
  ProhibitedSubstanceSnapshot,
} from "@snackcheck/contracts";
import { tokenize } from "./normalize";

const CATASTROPHIC_REGEX = /(\.\*)+|(\.\+)+|(\([^)]*[+*][^)]*\)[+*])/;

export function isSafeReviewedRegex(pattern: string): boolean {
  if (pattern.length === 0 || pattern.length > 200) {
    return false;
  }
  if (CATASTROPHIC_REGEX.test(pattern)) {
    return false;
  }
  if (!pattern.startsWith("^") || !pattern.endsWith("$")) {
    return false;
  }
  try {
    RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

function tokensEqualSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || haystack.length < needle.length) {
    return false;
  }
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

function aliasMatches(ingredient: ParsedIngredient, alias: EnabledAlias): boolean {
  if (alias.matchMode === "EXACT_SEGMENT") {
    return ingredient.normalized === alias.normalizedAlias;
  }

  if (alias.matchMode === "TOKEN_SEQUENCE") {
    return tokensEqualSequence(
      tokenize(ingredient.normalized),
      tokenize(alias.normalizedAlias),
    );
  }

  if (alias.matchMode === "REVIEWED_REGEX") {
    const pattern = alias.pattern;
    if (!pattern || !isSafeReviewedRegex(pattern)) {
      return false;
    }
    return new RegExp(pattern).test(ingredient.normalized);
  }

  return false;
}

export function matchRules(
  ingredients: ParsedIngredient[],
  substances: ProhibitedSubstanceSnapshot[],
): ComplianceMatch[] {
  const matches: ComplianceMatch[] = [];

  for (const substance of substances) {
    if (!substance.enabled) {
      continue;
    }
    for (const alias of substance.aliases) {
      if (!alias.enabled) {
        continue;
      }
      for (const ingredient of ingredients) {
        if (!aliasMatches(ingredient, alias)) {
          continue;
        }
        matches.push({
          substanceId: substance.id,
          canonicalName: substance.canonicalName,
          aliasId: alias.id,
          alias: alias.alias,
          formulationIngredientOrdinal: ingredient.ordinal,
          rawLabelValue: ingredient.raw,
          normalizedLabelValue: ingredient.normalized,
          startOffset: ingredient.startOffset,
          endOffset: ingredient.endOffset,
          matchMode: alias.matchMode,
          regulatorySourceId: alias.regulatorySourceId ?? substance.regulatorySourceId,
          precautionary: ingredient.presenceKind === "PRECAUTIONARY",
        });
      }
    }
  }

  return matches;
}
