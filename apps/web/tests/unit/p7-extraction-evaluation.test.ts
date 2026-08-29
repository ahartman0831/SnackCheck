import { describe, expect, it } from "vitest";
import {
  scoreExtractionObservation,
  summarizeExtractionScores,
} from "@/lib/ai/evaluation";

const actual = {
  panelFound: true,
  rawText: "Sugar, Sea Salt",
  ingredientText: "Sugar, Sea Salt",
  ingredients: [
    {
      raw: "Sugar",
      normalizedSuggestion: "sugar",
      confidence: 0.98,
      startOffset: 0,
      endOffset: 5,
    },
    {
      raw: "Sea Salt",
      normalizedSuggestion: "sea salt",
      confidence: 0.94,
      startOffset: 7,
      endOffset: 15,
    },
  ],
  overallConfidence: 0.95,
  warnings: ["GLARE" as const],
};

describe("Phase 7 extraction evaluation", () => {
  it("scores transcription quality without any compliance outcome", () => {
    const score = scoreExtractionObservation({
      expected: {
        panelFound: true,
        ingredientText: "sugar; sea salt",
        ingredientSegments: ["sugar", "sea salt"],
        warnings: ["GLARE"],
      },
      actual,
      attemptCount: 2,
      latencyMs: 240,
      estimatedCostUsd: 0.002,
    });

    expect(score).toMatchObject({
      panelDetectionCorrect: true,
      exactTextMatch: false,
      normalizedTextAccuracy: 1,
      ingredientSegmentF1: 1,
      warningRecall: 1,
      escalated: true,
      falseConfidence: false,
    });
    expect(JSON.stringify(score)).not.toMatch(/pass|fail|compliance/i);
  });

  it("reports confident wrong transcription as false confidence", () => {
    const score = scoreExtractionObservation({
      expected: {
        panelFound: true,
        ingredientText: "sugar, salt",
        ingredientSegments: ["sugar", "salt"],
        warnings: [],
      },
      actual: { ...actual, ingredientText: "peanuts", overallConfidence: 0.99 },
      attemptCount: 1,
      latencyMs: 100,
      estimatedCostUsd: null,
    });
    expect(score.falseConfidence).toBe(true);
    expect(summarizeExtractionScores([score])).toMatchObject({
      sampleCount: 1,
      falseConfidenceRate: 1,
      totalEstimatedCostUsd: null,
    });
  });
});
