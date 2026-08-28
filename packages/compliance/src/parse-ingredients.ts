import type { ParsedIngredient } from "@snackcheck/contracts";
import { clampInput, foldTypography, normalizeTokenString } from "./normalize";

export type ParseWarning =
  | "INPUT_TRUNCATED"
  | "SEGMENT_TRUNCATED"
  | "UNBALANCED_PARENTHESES"
  | "MALFORMED_INPUT"
  | "SEGMENT_CAP_REACHED";

export interface ParseResult {
  raw: string;
  normalizedText: string;
  ingredients: ParsedIngredient[];
  warnings: ParseWarning[];
}

const MAX_SEGMENTS = 500;
const MAX_SEGMENT_CHARS = 500;

const PRECAUTIONARY_LEADINS = [
  "may contain",
  "processed in a facility",
  "manufactured in a facility",
  "made in a facility",
  "produced in a facility",
  "packaged in a facility",
];

const DISCARDABLE_LEADINS = [
  /^ingredients?\s*:\s*/i,
  /^contains\s+2%\s+or\s+less\s+of\s*:?\s*/i,
  /^contains\s+2\s+percent\s+or\s+less\s+of\s*:?\s*/i,
  /^contains\s+less\s+than\s+2%\s+of\s*:?\s*/i,
  /^contains\s*:?\s*/i,
];

function isOpen(char: string): boolean {
  return char === "(" || char === "[";
}

function isClose(char: string): boolean {
  return char === ")" || char === "]";
}

function matchingClose(char: string): string {
  return char === "(" ? ")" : "]";
}

function stripLeadIn(value: string): string {
  let next = value.trim();
  for (const pattern of DISCARDABLE_LEADINS) {
    next = next.replace(pattern, "");
  }
  return next.trim();
}

function isPrecautionary(value: string): boolean {
  const lowered = value.trim().toLowerCase();
  return PRECAUTIONARY_LEADINS.some((leadin) => lowered.startsWith(leadin));
}

function isolatePrecautionarySections(value: string): string {
  let next = value;
  for (const leadin of PRECAUTIONARY_LEADINS) {
    const pattern = new RegExp(`([.;])\\s*(${leadin})`, "ig");
    next = next.replace(pattern, ", $2");
  }
  return next;
}

function splitTopLevel(
  value: string,
): Array<{ text: string; start: number; end: number }> {
  const parts: Array<{ text: string; start: number; end: number }> = [];
  const stack: string[] = [];
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    if (isOpen(char)) {
      stack.push(matchingClose(char));
      continue;
    }
    if (isClose(char)) {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
      continue;
    }
    if ((char === "," || char === ";") && stack.length === 0) {
      const text = value.slice(start, index).trim();
      if (text) {
        const leading = value.slice(start, index).match(/^\s*/)?.[0].length ?? 0;
        parts.push({
          text,
          start: start + leading,
          end: start + leading + text.length,
        });
      }
      start = index + 1;
    }
  }

  const tail = value.slice(start).trim();
  if (tail) {
    const leading = value.slice(start).match(/^\s*/)?.[0].length ?? 0;
    parts.push({
      text: tail,
      start: start + leading,
      end: start + leading + tail.length,
    });
  }

  return parts;
}

function extractNested(
  value: string,
  absoluteStart: number,
): Array<{ inner: string; start: number; end: number }> {
  const nested: Array<{ inner: string; start: number; end: number }> = [];
  const stack: Array<{ closer: string; openIndex: number }> = [];

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    if (isOpen(char)) {
      stack.push({ closer: matchingClose(char), openIndex: index });
      continue;
    }
    if (isClose(char) && stack.length > 0 && stack[stack.length - 1]?.closer === char) {
      const opened = stack.pop();
      if (opened && stack.length === 0) {
        const inner = value.slice(opened.openIndex + 1, index).trim();
        if (inner) {
          nested.push({
            inner,
            start: absoluteStart + opened.openIndex + 1,
            end: absoluteStart + index,
          });
        }
      }
    }
  }

  return nested;
}

function hasUnbalancedParentheses(value: string): boolean {
  const stack: string[] = [];
  for (const char of value) {
    if (isOpen(char)) {
      stack.push(matchingClose(char));
    } else if (isClose(char)) {
      if (stack.length === 0 || stack.pop() !== char) {
        return true;
      }
    }
  }
  return stack.length > 0;
}

export function parseIngredients(rawInput: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const truncated = rawInput.length > 20_000;
  if (truncated) {
    warnings.push("INPUT_TRUNCATED");
  }

  const raw = isolatePrecautionarySections(foldTypography(clampInput(rawInput)));
  if (hasUnbalancedParentheses(raw)) {
    warnings.push("UNBALANCED_PARENTHESES");
  }

  const ingredients: ParsedIngredient[] = [];
  let nextOrdinal = 0;

  const visit = (
    text: string,
    absoluteStart: number,
    parentOrdinal: number | null,
    precautionary: boolean,
  ) => {
    const segments = splitTopLevel(text);
    let followingPrecautionary = precautionary;
    for (const segment of segments) {
      if (ingredients.length >= MAX_SEGMENTS) {
        warnings.push("SEGMENT_CAP_REACHED");
        return;
      }

      let body = stripLeadIn(segment.text);
      if (!body) {
        continue;
      }

      const segmentPrecautionary = followingPrecautionary || isPrecautionary(body);
      if (segmentPrecautionary) {
        followingPrecautionary = true;
      }
      let stored = body;
      if (stored.length > MAX_SEGMENT_CHARS) {
        stored = stored.slice(0, MAX_SEGMENT_CHARS);
        warnings.push("SEGMENT_TRUNCATED");
      }

      const ordinal = nextOrdinal;
      nextOrdinal += 1;
      ingredients.push({
        ordinal,
        raw: stored,
        normalized: normalizeTokenString(stored),
        parentOrdinal,
        startOffset:
          absoluteStart +
          (segment.start - (text === raw ? 0 : 0)) +
          (segment.text.length === body.length ? 0 : segment.text.indexOf(body)),
        endOffset:
          absoluteStart +
          (segment.start - (text === raw ? 0 : 0)) +
          (segment.text.length === body.length ? 0 : segment.text.indexOf(body)) +
          stored.length,
        presenceKind: segmentPrecautionary ? "PRECAUTIONARY" : "DECLARED",
        warnings: [],
      });

      const nested = extractNested(segment.text, absoluteStart + segment.start);
      for (const child of nested) {
        visit(child.inner, child.start, ordinal, segmentPrecautionary);
      }
    }
  };

  if (!raw.trim()) {
    return {
      raw,
      normalizedText: "",
      ingredients: [],
      warnings: ["MALFORMED_INPUT"],
    };
  }

  visit(raw, 0, null, false);

  return {
    raw,
    normalizedText: normalizeTokenString(raw),
    ingredients,
    warnings,
  };
}
