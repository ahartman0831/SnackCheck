export const CATALOG_SHORTLIST_VERSION = "school-use-v1";
export const DEFAULT_SHORTLIST_TARGET = 190;
export const MAX_SHORTLIST_TARGET = 200;

export const SHORTLIST_GROUPS = [
  "SNACKS",
  "BREAKFAST",
  "LUNCHBOX",
  "DRINKS",
  "TREATS",
] as const;

export type ShortlistGroup = (typeof SHORTLIST_GROUPS)[number];

export type ShortlistCandidate = {
  id: string;
  brand: string;
  productName: string;
  category: string | null;
  variant: string | null;
  size: string | null;
  normalizedGtin14: string;
  sourceModifiedAt: string | null;
  sourcePublishedAt: string | null;
  qualityFlags: string[];
  screenStatus: string;
  candidateState: string;
  discontinued: boolean;
};

export type SelectedShortlistCandidate = ShortlistCandidate & {
  group: ShortlistGroup;
  rank: number;
};

const GROUP_WEIGHTS: Record<ShortlistGroup, number> = {
  SNACKS: 32,
  BREAKFAST: 25,
  LUNCHBOX: 18,
  DRINKS: 10,
  TREATS: 15,
};

const CATEGORY_GROUPS: Record<ShortlistGroup, ReadonlySet<string>> = {
  SNACKS: new Set([
    "popcorn, peanuts, seeds & related snacks",
    "chips, pretzels & snacks",
    "other snacks",
    "snack, energy & granola bars",
    "wholesome snacks",
    "crackers & biscotti",
    "chips/crisps/snack mixes - natural/extruded (shelf stable)",
    "cereal/muesli bars",
    "flavored snack crackers",
  ]),
  BREAKFAST: new Set([
    "yogurt",
    "cereal",
    "cereals products - ready to eat (shelf stable)",
    "jam, jelly & fruit spreads",
    "breads & buns",
    "nut & seed butters",
    "milk",
    "honey",
    "croissants, sweet rolls, muffins & other pastries",
  ]),
  LUNCHBOX: new Set([
    "cheese",
    "canned fruit",
    "pre-packaged fruit & vegetables",
    "pepperoni, salami & cold cuts",
    "lunch snacks & combinations",
    "canned meat",
    "poultry, chicken & turkey",
    "prepared wraps and burittos",
  ]),
  DRINKS: new Set([
    "fruit & vegetable juice, nectars & fruit drinks",
    "soda",
    "other drinks",
    "sport drinks",
    "water",
  ]),
  TREATS: new Set([
    "ice cream & frozen yogurt",
    "candy",
    "chocolate",
    "cookies & biscuits",
    "cakes, cupcakes, snack cakes",
    "biscuits/cookies (shelf stable)",
    "other frozen desserts",
  ]),
};

function normalizedCategory(value: string | null): string {
  return value?.trim() || "Uncategorized";
}

export function classifyShortlistCategory(
  category: string | null,
): ShortlistGroup | null {
  const value = normalizedCategory(category).toLocaleLowerCase();
  return SHORTLIST_GROUPS.find((group) => CATEGORY_GROUPS[group].has(value)) ?? null;
}

function observedAt(candidate: ShortlistCandidate): number {
  const value = candidate.sourceModifiedAt ?? candidate.sourcePublishedAt;
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareCandidates(left: ShortlistCandidate, right: ShortlistCandidate): number {
  const leftCompleteness = Number(Boolean(left.size)) + Number(Boolean(left.variant));
  const rightCompleteness = Number(Boolean(right.size)) + Number(Boolean(right.variant));
  if (leftCompleteness !== rightCompleteness) return rightCompleteness - leftCompleteness;
  const dateDifference = observedAt(right) - observedAt(left);
  if (dateDifference !== 0) return dateDifference;
  const brandDifference = left.brand.localeCompare(right.brand);
  if (brandDifference !== 0) return brandDifference;
  const nameDifference = left.productName.localeCompare(right.productName);
  if (nameDifference !== 0) return nameDifference;
  return left.normalizedGtin14.localeCompare(right.normalizedGtin14);
}

function eligible(candidate: ShortlistCandidate): boolean {
  return (
    candidate.candidateState === "SCREENED_PASS" &&
    candidate.screenStatus === "PASS" &&
    !candidate.discontinued &&
    candidate.qualityFlags.length === 0 &&
    classifyShortlistCategory(candidate.category) !== null
  );
}

function groupTargets(target: number): Record<ShortlistGroup, number> {
  const result = Object.fromEntries(
    SHORTLIST_GROUPS.map((group) => [
      group,
      Math.floor((target * GROUP_WEIGHTS[group]) / 100),
    ]),
  ) as Record<ShortlistGroup, number>;
  let assigned = Object.values(result).reduce((sum, value) => sum + value, 0);
  for (const group of SHORTLIST_GROUPS) {
    if (assigned >= target) break;
    result[group] += 1;
    assigned += 1;
  }
  return result;
}

function balancedGroupSelection(
  candidates: ShortlistCandidate[],
  target: number,
  brandCounts: Map<string, number>,
): ShortlistCandidate[] {
  const buckets = new Map<string, ShortlistCandidate[]>();
  for (const candidate of candidates) {
    const category = normalizedCategory(candidate.category);
    const bucket = buckets.get(category) ?? [];
    bucket.push(candidate);
    buckets.set(category, bucket);
  }
  for (const bucket of buckets.values()) bucket.sort(compareCandidates);
  const categories = [...buckets.keys()].sort((left, right) => left.localeCompare(right));
  const selected: ShortlistCandidate[] = [];
  const selectedIds = new Set<string>();

  for (const brandLimit of [6, Number.POSITIVE_INFINITY]) {
    let advanced = true;
    while (selected.length < target && advanced) {
      advanced = false;
      for (const category of categories) {
        const bucket = buckets.get(category) ?? [];
        const index = bucket.findIndex((candidate) => {
          const count = brandCounts.get(candidate.brand.toLocaleLowerCase()) ?? 0;
          return !selectedIds.has(candidate.id) && count < brandLimit;
        });
        if (index < 0) continue;
        const [candidate] = bucket.splice(index, 1);
        if (!candidate) continue;
        selected.push(candidate);
        selectedIds.add(candidate.id);
        const brand = candidate.brand.toLocaleLowerCase();
        brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
        advanced = true;
        if (selected.length >= target) break;
      }
    }
  }
  return selected;
}

export function selectCatalogShortlist(
  candidates: ShortlistCandidate[],
  requestedTarget = DEFAULT_SHORTLIST_TARGET,
): SelectedShortlistCandidate[] {
  const target = Math.min(Math.max(Math.trunc(requestedTarget), 1), MAX_SHORTLIST_TARGET);
  const pools = new Map<ShortlistGroup, ShortlistCandidate[]>();
  for (const group of SHORTLIST_GROUPS) pools.set(group, []);
  for (const candidate of candidates) {
    if (!eligible(candidate)) continue;
    const group = classifyShortlistCategory(candidate.category);
    if (group) pools.get(group)?.push(candidate);
  }

  const quotas = groupTargets(target);
  const brandCounts = new Map<string, number>();
  const selected: Array<ShortlistCandidate & { group: ShortlistGroup }> = [];
  const selectedIds = new Set<string>();
  for (const group of SHORTLIST_GROUPS) {
    const groupSelection = balancedGroupSelection(
      pools.get(group) ?? [],
      quotas[group],
      brandCounts,
    );
    for (const candidate of groupSelection) {
      selected.push({ ...candidate, group });
      selectedIds.add(candidate.id);
    }
  }

  if (selected.length < target) {
    const remainder = SHORTLIST_GROUPS.flatMap((group) =>
      (pools.get(group) ?? [])
        .filter((candidate) => !selectedIds.has(candidate.id))
        .map((candidate) => ({ ...candidate, group })),
    ).sort((left, right) => compareCandidates(left, right));
    for (const candidate of remainder) {
      if (selected.length >= target) break;
      selected.push(candidate);
    }
  }

  return selected.slice(0, target).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}
