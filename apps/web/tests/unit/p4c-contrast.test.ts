import { describe, expect, it } from "vitest";

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  const red = channel(Number.parseInt(normalized.slice(0, 2), 16));
  const green = channel(Number.parseInt(normalized.slice(2, 4), 16));
  const blue = channel(Number.parseInt(normalized.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("filled accent contrast", () => {
  it("keeps light-mode primary actions at or above WCAG AA", () => {
    expect(contrastRatio("#FFFFFF", "#4F46E5")).toBeGreaterThanOrEqual(4.5);
  });

  it("does not put white text on the dark-mode accent fill", () => {
    expect(contrastRatio("#FFFFFF", "#818CF8")).toBeLessThan(4.5);
    expect(contrastRatio("#FFFFFF", "#22D3EE")).toBeLessThan(4.5);
  });

  it("pairs dark-mode accent fills with on-accent text", () => {
    expect(contrastRatio("#0B1220", "#818CF8")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#0B1220", "#22D3EE")).toBeGreaterThanOrEqual(4.5);
  });
});
