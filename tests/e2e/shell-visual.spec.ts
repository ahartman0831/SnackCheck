import path from "node:path";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const artifacts =
  process.env.PLAYWRIGHT_ARTIFACTS_DIR ?? path.join(__dirname, "artifacts");

const widths = [320, 390, 768, 1280, 1440] as const;

test.describe("Phase 3 shell and gallery", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium");
  });

  for (const width of widths) {
    test(`home has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await expect(
        page.getByRole("heading", {
          name: "Start with the ingredients.",
        }),
      ).toBeVisible();
      const overflow = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
      });
      expect(overflow).toBe(false);
      await page.screenshot({
        path: path.join(artifacts, `home-${width}.png`),
        fullPage: true,
      });
    });
  }

  test("dark mode and reduced motion do not overflow", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const overflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
    });
    expect(overflow).toBe(false);
    await page.screenshot({
      path: path.join(artifacts, "home-390-dark-reduced.png"),
      fullPage: true,
    });
  });

  test("200% zoom remains usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.addStyleTag({ content: "html { zoom: 2; }" });
    await expect(page.getByRole("link", { name: /SnackCheck home/i })).toBeVisible();
    await page.screenshot({
      path: path.join(artifacts, "home-390-zoom-200.png"),
    });
  });

  test("home and gallery have no critical or serious axe violations", async ({
    page,
  }) => {
    await page.goto("/");
    const home = await new AxeBuilder({ page }).analyze();
    const homeSerious = home.violations.filter(
      (item) => item.impact === "critical" || item.impact === "serious",
    );
    expect(homeSerious).toEqual([]);

    const galleryResponse = await page.goto("/dev/ui");
    if (process.env.CI || process.env.PLAYWRIGHT_PRODUCTION === "true") {
      expect(galleryResponse?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { name: "SnackCheck UI gallery" }),
      ).toHaveCount(0);
      return;
    }
    await expect(
      page.getByRole("heading", { name: "SnackCheck UI gallery" }),
    ).toBeVisible();
    const gallery = await new AxeBuilder({ page }).analyze();
    const gallerySerious = gallery.violations.filter(
      (item) => item.impact === "critical" || item.impact === "serious",
    );
    expect(gallerySerious).toEqual([]);
    await page.screenshot({
      path: path.join(artifacts, "dev-ui-1280.png"),
      fullPage: true,
    });
  });
});
