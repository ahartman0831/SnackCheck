import type { ExtractionWarning, IngredientExtraction } from "@snackcheck/contracts";

export interface ExtractionEvaluationExpectation {
  panelFound: boolean;
  ingredientText: string;
  ingredientSegments: string[];
  warnings: ExtractionWarning[];
}

export interface ExtractionEvaluationObservation {
  expected: ExtractionEvaluationExpectation;
  actual: IngredientExtraction;
  attemptCount: number;
  latencyMs: number;
  estimatedCostUsd: number | null;
}

export interface ExtractionEvaluationScore {
  panelDetectionCorrect: boolean;
  exactTextMatch: boolean;
  normalizedTextAccuracy: number;
  ingredientSegmentF1: number;
  warningRecall: number;
  escalated: boolean;
  falseConfidence: boolean;
  latencyMs: number;
  estimatedCostUsd: number | null;
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution =
        previous[rightIndex - 1] +
        (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(
        (previous[rightIndex] ?? 0) + 1,
        (current[rightIndex - 1] ?? 0) + 1,
        substitution,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? 0;
}

function textAccuracy(expected: string, actual: string): number {
  const left = normalize(expected);
  const right = normalize(actual);
  const length = Math.max(left.length, right.length);
  return length === 0 ? 1 : Math.max(0, 1 - editDistance(left, right) / length);
}

function segmentF1(expected: string[], actual: IngredientExtraction): number {
  const expectedSet = new Set(expected.map(normalize).filter(Boolean));
  const actualSet = new Set(
    actual.ingredients.map((ingredient) => normalize(ingredient.raw)).filter(Boolean),
  );
  if (expectedSet.size === 0 && actualSet.size === 0) return 1;
  let matches = 0;
  for (const segment of actualSet) {
    if (expectedSet.has(segment)) matches += 1;
  }
  const precision = actualSet.size === 0 ? 0 : matches / actualSet.size;
  const recall = expectedSet.size === 0 ? 0 : matches / expectedSet.size;
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

function warningRecall(
  expected: ExtractionWarning[],
  actual: ExtractionWarning[],
): number {
  if (expected.length === 0) return 1;
  const actualSet = new Set(actual);
  return expected.filter((warning) => actualSet.has(warning)).length / expected.length;
}

export function scoreExtractionObservation(
  observation: ExtractionEvaluationObservation,
): ExtractionEvaluationScore {
  const normalizedTextAccuracy = textAccuracy(
    observation.expected.ingredientText,
    observation.actual.ingredientText,
  );
  const panelDetectionCorrect =
    observation.expected.panelFound === observation.actual.panelFound;
  return {
    panelDetectionCorrect,
    exactTextMatch:
      observation.expected.ingredientText === observation.actual.ingredientText,
    normalizedTextAccuracy,
    ingredientSegmentF1: segmentF1(
      observation.expected.ingredientSegments,
      observation.actual,
    ),
    warningRecall: warningRecall(
      observation.expected.warnings,
      observation.actual.warnings,
    ),
    escalated: observation.attemptCount > 1,
    falseConfidence:
      observation.actual.overallConfidence >= 0.8 &&
      (!panelDetectionCorrect || normalizedTextAccuracy < 0.9),
    latencyMs: observation.latencyMs,
    estimatedCostUsd: observation.estimatedCostUsd,
  };
}

export function summarizeExtractionScores(scores: ExtractionEvaluationScore[]) {
  const denominator = scores.length || 1;
  const average = (select: (score: ExtractionEvaluationScore) => number) =>
    scores.reduce((total, score) => total + select(score), 0) / denominator;
  const knownCosts = scores.flatMap((score) =>
    score.estimatedCostUsd === null ? [] : [score.estimatedCostUsd],
  );
  return {
    sampleCount: scores.length,
    panelDetectionRate: average((score) => Number(score.panelDetectionCorrect)),
    exactTextRate: average((score) => Number(score.exactTextMatch)),
    normalizedTextAccuracy: average((score) => score.normalizedTextAccuracy),
    ingredientSegmentF1: average((score) => score.ingredientSegmentF1),
    warningRecall: average((score) => score.warningRecall),
    escalationRate: average((score) => Number(score.escalated)),
    falseConfidenceRate: average((score) => Number(score.falseConfidence)),
    averageLatencyMs: average((score) => score.latencyMs),
    totalEstimatedCostUsd:
      knownCosts.length === 0
        ? null
        : knownCosts.reduce((total, cost) => total + cost, 0),
  };
}
