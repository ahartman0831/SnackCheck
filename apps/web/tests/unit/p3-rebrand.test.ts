import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAME, publicAppUrl } from "../../lib/brand";

const root = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("SnackCheck rebrand", () => {
  it("uses SnackCheck as the current product name", () => {
    expect(APP_NAME).toBe("SnackCheck");
    expect(read("package.json")).toContain("SnackCheck");
    expect(read("apps/web/app/layout.tsx")).toContain("APP_NAME");
    expect(read("apps/web/app/manifest.ts")).toContain("APP_NAME");
  });

  it("does not hard-code a production domain", () => {
    expect(publicAppUrl()).toMatch(/^https?:\/\//);
    expect(read("apps/web/app/robots.ts")).toContain("publicAppUrl()");
    expect(read("apps/web/app/sitemap.ts")).toContain("publicAppUrl()");
    expect(read("apps/web/app/sitemap.ts")).not.toMatch(/canibringthis\.com/i);
  });
});
