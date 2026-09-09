import { describe, expect, it } from "vitest";
import { arizonaRuleset } from "../src/index";
import { FDA_COLOR_ALIASES, FDA_COLOR_SOURCE_ID } from "../src/fda-color-aliases";

import { previewColorAliases } from "../src/preview-color-aliases";
const draft = () => ({ ...arizonaRuleset(), isPublished: false, publishedAt: null });
const match = (text: string) => previewColorAliases(text, draft()).proposedMatches;
describe("sourced color label names", () => {
  it.each(FDA_COLOR_ALIASES)("recognizes $alias with source provenance", (alias) => {
    expect(match(`sugar, ${alias.alias}, salt`)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalName: alias.canonicalName,
          regulatorySourceId: FDA_COLOR_SOURCE_ID,
        }),
      ]),
    );
  });
  it("recognizes mechanical punctuation variants and nested color lists", () => {
    for (const text of [
      "FD&C Yellow #6",
      "Red No 40",
      "Red 40.",
      "colors (Red 40, Blue 1)",
    ]) {
      expect(match(text).length).toBeGreaterThan(0);
    }
  });
  it("does not expand unrelated numbers, unnamed colors or pending chemical/lake aliases", () => {
    for (const text of [
      "red pepper",
      "red 400",
      "red 40.1",
      "red .40",
      "yellow 50",
      "Blue 10",
      "artificial colors",
      "Allura Red AC",
      "E129",
      "Red 40 Lake",
      "may contain Red 40 Lake",
    ]) {
      expect(match(text), text).toEqual([]);
    }
  });
  it("keeps the preview separate from current draft matches and does not mutate input", () => {
    const input = draft();
    const before = structuredClone(input);
    const result = previewColorAliases("Red 40", input);
    expect(result.reviewOnly).toBe(true);
    expect(result.currentMatches).toEqual([]);
    expect(result.proposedRulesetHash).not.toBe(result.baseRulesetHash);
    expect(input).toEqual(before);
  });
  it("rejects published or corrupted snapshots", () => {
    expect(() => previewColorAliases("Red 40", arizonaRuleset())).toThrow();
    expect(() =>
      previewColorAliases("Red 40", { ...draft(), rulesetHash: "0".repeat(64) }),
    ).toThrow();
  });
  it("retains precautionary handling", () => {
    expect(match("sugar. May contain Red 40")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ canonicalName: "Red dye 40", precautionary: true }),
      ]),
    );
  });
});
