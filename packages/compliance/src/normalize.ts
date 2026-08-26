const SMART_QUOTES: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  [/[\u201C\u201D\u201E\u201F]/g, '"'],
  [/[\u2013\u2014\u2212]/g, "-"],
  [/[\u00A0\u202F\u2007\u2009]/g, " "],
];

const MAX_INPUT_CHARS = 20_000;

export function clampInput(value: string): string {
  if (value.length <= MAX_INPUT_CHARS) {
    return value;
  }
  return value.slice(0, MAX_INPUT_CHARS);
}

export function foldTypography(value: string): string {
  let next = value.normalize("NFKC");
  for (const [pattern, replacement] of SMART_QUOTES) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function localeIndependentLower(value: string): string {
  return value.replace(/[A-Z]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 32));
}

function normalizeAmpersands(value: string): string {
  return value.replace(/&/g, " and ");
}

function normalizeNumberSign(value: string): string {
  return value.replace(/#\s*(?=\d)/g, " no ");
}

function stripAbbreviationPeriods(value: string): string {
  return value.replace(/(?<=\p{L})\.(?=\s|$|\p{P})/gu, "");
}

function preserveDecimalPoints(value: string): string {
  return value.replace(/[^\p{L}\p{N}.]+/gu, " ").replace(/(?<!\d)\.(?!\d)/g, " ");
}

export function normalizeTokenString(value: string): string {
  const folded = foldTypography(clampInput(value));
  const lowered = localeIndependentLower(folded);
  const ampersands = normalizeAmpersands(lowered);
  const numbers = normalizeNumberSign(ampersands);
  const withoutAbbrev = stripAbbreviationPeriods(numbers);
  const spaced = preserveDecimalPoints(withoutAbbrev);
  return spaced.replace(/\s+/g, " ").trim();
}

export function normalizeIngredientText(value: string): string {
  return normalizeTokenString(value);
}

export function normalizeAlias(value: string): string {
  return normalizeTokenString(value);
}

export function tokenize(normalized: string): string[] {
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter((token) => token.length > 0);
}

export function prepareForSegmentation(value: string): string {
  const folded = foldTypography(clampInput(value));
  const lowered = localeIndependentLower(folded);
  const ampersands = normalizeAmpersands(lowered);
  const numbers = normalizeNumberSign(ampersands);
  const withoutAbbrev = stripAbbreviationPeriods(numbers);
  return withoutAbbrev.replace(/\s+/g, " ").trim();
}
