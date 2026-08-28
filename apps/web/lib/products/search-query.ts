export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_CHARS = 80;
export const SEARCH_MAX_LIMIT = 24;

export function escapeLikeWildcards(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function normalizeSearchQuery(
  raw: string,
): { query: string } | { error: "too_short" | "too_long" } {
  const query = raw.replace(/[\u0000-\u001F]/g, "").trim();
  if (query.length < SEARCH_MIN_CHARS) {
    return { error: "too_short" };
  }
  if (query.length > SEARCH_MAX_CHARS) {
    return { error: "too_long" };
  }
  return { query };
}

export function clampSearchLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) {
    return SEARCH_MAX_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), SEARCH_MAX_LIMIT);
}
