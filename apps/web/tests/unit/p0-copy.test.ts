import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "../..");

function readApp(rel: string): string {
  return readFileSync(path.join(webRoot, rel), "utf8");
}

const FEATURE_BARCODE_CAMERA = process.env.FEATURE_BARCODE_CAMERA === "true";
const FEATURE_PHOTO_EXTRACTION = process.env.FEATURE_PHOTO_EXTRACTION === "true";

describe("P0-6 barcode copy", () => {
  it("must not claim camera scanning while FEATURE_BARCODE_CAMERA is off", () => {
    expect(FEATURE_BARCODE_CAMERA).toBe(false);
    const page = readApp("app/scan/barcode/page.tsx");
    expect(page).not.toMatch(/Camera scanning uses the browser/i);
    expect(page).not.toMatch(/@zxing|BrowserMultiFormatReader|BarcodeCamera/);
    expect(page).toContain("Enter a barcode");
  });
});

describe("P0-9 photo extraction copy", () => {
  it("must not advertise photo extraction while the extract route is paste-only", () => {
    expect(FEATURE_PHOTO_EXTRACTION).toBe(false);
    const home = readApp("app/page.tsx");
    const ingredients = readApp("app/scan/ingredients/page.tsx");
    const search = readApp("app/search/page.tsx");
    const extract = readApp("app/api/v1/submissions/[id]/extract/route.ts");

    expect(extract).toContain("pastedText");
    expect(extract).toContain('pasted.split(",")');
    expect(home).not.toMatch(/Scan ingredients/);
    expect(ingredients).not.toMatch(/Image extraction/i);
    expect(ingredients).not.toMatch(/Scan ingredients/);
    expect(ingredients).toContain("Check an ingredient list");
    expect(search).not.toMatch(/photograph the ingredient panel/i);
  });
});
