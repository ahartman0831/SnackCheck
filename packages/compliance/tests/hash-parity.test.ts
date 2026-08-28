import { describe, expect, it } from "vitest";
import {
  arizonaRuleset,
  hashCanonicalJson,
  hashRuleset,
  rulesetHashMatches,
  rulesetHashPayload,
} from "../src/index";

describe("ruleset hash parity", () => {
  it("is deterministic and matches the canonical payload serializer", () => {
    const ruleset = arizonaRuleset();
    const payload = rulesetHashPayload(ruleset);
    expect(hashRuleset(ruleset)).toBe(hashCanonicalJson(payload));
    expect(hashRuleset(ruleset)).toBe(hashRuleset(arizonaRuleset()));
    expect(rulesetHashMatches(ruleset, ruleset.rulesetHash)).toBe(true);
  });

  it("changes when an enabled substance changes", () => {
    const ruleset = arizonaRuleset();
    const mutated = {
      ...ruleset,
      substances: ruleset.substances.map((substance, index) =>
        index === 0
          ? { ...substance, canonicalNormalized: "changed substance" }
          : substance,
      ),
    };
    expect(hashRuleset(mutated)).not.toBe(hashRuleset(ruleset));
  });

  it("serializes the same object keys the SQL canonical_json function sorts", () => {
    const serialized = JSON.stringify(rulesetHashPayload(arizonaRuleset()));
    const keys = Object.keys(rulesetHashPayload(arizonaRuleset())).sort();
    expect(keys).toEqual([
      "code",
      "contexts",
      "effectiveFrom",
      "effectiveUntil",
      "freshnessAgingDays",
      "freshnessCurrentDays",
      "id",
      "sourceIds",
      "substances",
      "version",
    ]);
    expect(serialized.startsWith("{")).toBe(true);
  });
});
