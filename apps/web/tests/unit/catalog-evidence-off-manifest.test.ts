import { describe, expect, it } from "vitest";
import {
  OpenFoodFactsManifestSchema,
  selectManifestCandidates,
} from "@/lib/catalog-evidence/open-food-facts-manifest";

const first = "01124853-12d7-4810-bde3-b828a156ee54";
const second = "0276bec1-77ae-437c-be13-91005c45fcb8";

describe("OFF batch manifests", () => {
  it("rejects empty, duplicate, malformed and oversized candidate lists", () => {
    for (const candidateIds of [[], [first, first], ["invalid"], Array(16).fill(first)]) {
      expect(OpenFoodFactsManifestSchema.safeParse({ candidateIds }).success).toBe(false);
    }
  });

  it("preserves the reviewed order regardless of database order and ignores unrelated rows", () => {
    const manifest = OpenFoodFactsManifestSchema.parse({ candidateIds: [second, first] });
    expect(
      selectManifestCandidates(manifest, [
        { id: first },
        { id: "unrelated" },
        { id: second },
      ]),
    ).toEqual([{ id: second }, { id: first }]);
  });

  it("rejects the whole selection when a candidate disappears or becomes ineligible", () => {
    const manifest = OpenFoodFactsManifestSchema.parse({ candidateIds: [first, second] });
    expect(() => selectManifestCandidates(manifest, [{ id: first }])).toThrow(
      "still be eligible",
    );
  });
});
