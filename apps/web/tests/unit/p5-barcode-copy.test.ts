import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  barcodeActionLabel,
  barcodePageDescription,
  barcodePageTitle,
} from "../../lib/public-copy";

const page = readFileSync(
  path.resolve(__dirname, "../../app/scan/barcode/page.tsx"),
  "utf8",
);

describe("Phase 5 feature-flag copy", () => {
  it("keeps camera-off copy honest", () => {
    const env = { FEATURE_BARCODE_CAMERA: "false" };
    expect(barcodeActionLabel(env)).toBe("Enter a barcode");
    expect(barcodePageTitle(env)).toBe("Enter a barcode");
    expect(barcodePageDescription(env)).toMatch(/Type or paste/);
    expect(barcodePageDescription(env)).not.toMatch(/Point the camera/i);
  });

  it("names the camera only when the flag is on", () => {
    const env = { FEATURE_BARCODE_CAMERA: "true" };
    expect(barcodeActionLabel(env)).toBe("Scan a barcode");
    expect(barcodePageDescription(env)).toMatch(/camera/i);
  });

  it("does not import the decoder from the barcode page source", () => {
    expect(page).toContain("Enter a barcode");
    expect(page).not.toMatch(/@zxing|BrowserMultiFormatReader|BarcodeCamera/);
  });
});
