import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, normalizeAlias } from "../src/index";

describe("compliance package bootstrap", () => {
  it("exports a versioned engine", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("normalizes mechanical statute variants the same way", () => {
    expect(normalizeAlias("Yellow Dye No. 5")).toBe("yellow dye no 5");
    expect(normalizeAlias("Yellow Dye #5")).toBe("yellow dye no 5");
  });
});
