export const CATALOG_RELEVANCE_VERSION = "classroom-use-v2";
export const CATALOG_SHORTLIST_VERSION = CATALOG_RELEVANCE_VERSION;
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
  relevance: ClassroomRelevanceAssessment;
};

export const CLASSROOM_RELEVANCE_TIERS = ["HIGH", "MEDIUM", "LOW", "EXCLUDED"] as const;
export type ClassroomRelevanceTier = (typeof CLASSROOM_RELEVANCE_TIERS)[number];

export const CATALOG_AUTOMATION_ROUTES = [
  "AUTO_EVIDENCE",
  "HUMAN_EXCEPTION",
  "DEPRIORITIZED",
] as const;
export type CatalogAutomationRoute = (typeof CATALOG_AUTOMATION_ROUTES)[number];

export type ClassroomRelevanceAssessment = {
  version: typeof CATALOG_RELEVANCE_VERSION;
  group: ShortlistGroup | null;
  score: number;
  tier: ClassroomRelevanceTier;
  route: CatalogAutomationRoute;
  reasons: string[];
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
    "croissants, sweet rolls, muffins & other pastries",
  ]),
  LUNCHBOX: new Set([
    "cheese",
    "pre-packaged fruit & vegetables",
    "lunch snacks & combinations",
  ]),
  DRINKS: new Set([
    "fruit & vegetable juice, nectars & fruit drinks",
    "soda",
    "other drinks",
    "sport drinks",
    "water",
  ]),
  TREATS: new Set([
    "candy",
    "chocolate",
    "cookies & biscuits",
    "cakes, cupcakes, snack cakes",
    "biscuits/cookies (shelf stable)",
  ]),
};

const GROUP_BASE_SCORE: Record<ShortlistGroup, number> = {
  SNACKS: 65,
  BREAKFAST: 45,
  LUNCHBOX: 45,
  DRINKS: 50,
  TREATS: 60,
};

const PORTABLE_PRODUCT =
  /\b(snack|bar|bites?|chips?|crisps?|crackers?|cookies?|wafers?|pretzels?|popcorn|trail mix|fruit snacks?|pouches?|cups?|juice|drink|water|soda|mini|string cheese|cheese sticks?)\b/i;
const PACKAGE_SIGNAL =
  /\b(individual|single[ -]?serve|multipacks?|multi[ -]?packs?|pouches?|cups?|boxes|box|packs?|pack of|snack size)\b/i;
const BULK_OR_FOODSERVICE =
  /\b(foodservice|food service|restaurant|catering|bulk|gallon|\d+\s*gal\b|ingredient|concentrate)\b/i;
const GENERIC_OR_PREPARATION =
  /\b(uncooked|cooking|baking|sauce|syrup|spread|seasoning|marinade|broth|dressing|flour|oil|dough|kabob|steak|fillet)\b/i;

function combinedText(candidate: ShortlistCandidate): string {
  return [candidate.brand, candidate.productName, candidate.variant, candidate.category]
    .filter(Boolean)
    .join(" ");
}

function normalizedCategory(value: string | null): string {
  return value?.trim() || "Uncategorized";
}

export function classifyShortlistCategory(
  category: string | null,
): ShortlistGroup | null {
  const value = normalizedCategory(category).toLocaleLowerCase();
  return SHORTLIST_GROUPS.find((group) => CATEGORY_GROUPS[group].has(value)) ?? null;
}

export function assessClassroomRelevance(
  candidate: ShortlistCandidate,
): ClassroomRelevanceAssessment {
  const group = classifyShortlistCategory(candidate.category);
  const text = combinedText(candidate);
  const reasons: string[] = [];
  if (candidate.discontinued) {
    return {
      version: CATALOG_RELEVANCE_VERSION,
      group,
      score: 0,
      tier: "EXCLUDED",
      route: "DEPRIORITIZED",
      reasons: ["DISCONTINUED_SOURCE_RECORD"],
    };
  }
  if (!group) {
    return {
      version: CATALOG_RELEVANCE_VERSION,
      group: null,
      score: 0,
      tier: "EXCLUDED",
      route: "DEPRIORITIZED",
      reasons: ["CATEGORY_NOT_CLASSROOM_FOCUSED"],
    };
  }
  if (BULK_OR_FOODSERVICE.test(text)) {
    return {
      version: CATALOG_RELEVANCE_VERSION,
      group,
      score: 0,
      tier: "EXCLUDED",
      route: "DEPRIORITIZED",
      reasons: ["BULK_OR_FOODSERVICE_SIGNAL"],
    };
  }

  let score = GROUP_BASE_SCORE[group];
  reasons.push(`CLASSROOM_CATEGORY_${group}`);
  if (PORTABLE_PRODUCT.test(text)) {
    score += 15;
    reasons.push("PORTABLE_PRODUCT_SIGNAL");
  }
  if (PACKAGE_SIGNAL.test(text)) {
    score += 10;
    reasons.push("INDIVIDUAL_PACKAGE_SIGNAL");
  } else {
    reasons.push("PACKAGE_FORMAT_UNCONFIRMED");
  }
  if (GENERIC_OR_PREPARATION.test(text)) {
    score -= 25;
    reasons.push("PREPARATION_ITEM_SIGNAL");
  }
  if (!candidate.variant && candidate.productName.trim().split(/\s+/).length <= 2) {
    score -= 10;
    reasons.push("GENERIC_PRODUCT_IDENTITY");
  }
  score = Math.max(0, Math.min(100, score));
  const tier: ClassroomRelevanceTier =
    score >= 70 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  const route: CatalogAutomationRoute =
    candidate.screenStatus === "VERIFY" || candidate.qualityFlags.length > 0
      ? "HUMAN_EXCEPTION"
      : candidate.screenStatus === "PASS" && (tier === "HIGH" || tier === "MEDIUM")
        ? "AUTO_EVIDENCE"
        : "DEPRIORITIZED";
  return {
    version: CATALOG_RELEVANCE_VERSION,
    group,
    score,
    tier,
    route,
    reasons,
  };
}

function observedAt(candidate: ShortlistCandidate): number {
  const value = candidate.sourceModifiedAt ?? candidate.sourcePublishedAt;
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareCandidates(left: ShortlistCandidate, right: ShortlistCandidate): number {
  const relevanceDifference =
    assessClassroomRelevance(right).score - assessClassroomRelevance(left).score;
  if (relevanceDifference !== 0) return relevanceDifference;
  const dateDifference = observedAt(right) - observedAt(left);
  if (dateDifference !== 0) return dateDifference;
  const brandDifference = left.brand.localeCompare(right.brand);
  if (brandDifference !== 0) return brandDifference;
  const nameDifference = left.productName.localeCompare(right.productName);
  if (nameDifference !== 0) return nameDifference;
  return left.normalizedGtin14.localeCompare(right.normalizedGtin14);
}

function eligible(candidate: ShortlistCandidate): boolean {
  const relevance = assessClassroomRelevance(candidate);
  return (
    candidate.candidateState === "SCREENED_PASS" &&
    candidate.screenStatus === "PASS" &&
    !candidate.discontinued &&
    candidate.qualityFlags.length === 0 &&
    relevance.tier === "HIGH" &&
    relevance.route === "AUTO_EVIDENCE"
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
    relevance: assessClassroomRelevance(candidate),
  }));
}
