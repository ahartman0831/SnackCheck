import { describe, expect, it } from "vitest";
import { hideAppChrome } from "../../lib/shell";
import { resolveTheme } from "../../lib/theme";

describe("theme resolution", () => {
  it("defaults to the system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("honors an explicit stored preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("application shell chrome", () => {
  it("hides the tab bar on scanner, confirmation, and admin routes", () => {
    expect(hideAppChrome("/scan/barcode")).toBe(true);
    expect(hideAppChrome("/scan/confirm/abc")).toBe(true);
    expect(hideAppChrome("/admin")).toBe(true);
    expect(hideAppChrome("/search")).toBe(false);
    expect(hideAppChrome("/")).toBe(false);
  });
});
