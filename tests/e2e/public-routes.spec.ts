import path from "node:path";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const artifacts = path.join(__dirname, "artifacts");

const routes = [
  { path: "/", name: "home" },
  { path: "/search", name: "search-empty" },
  { path: "/search?q=oat", name: "search-query" },
  { path: "/approved", name: "approved" },
  { path: "/rules/arizona", name: "rules" },
  { path: "/scan/barcode", name: "barcode" },
  { path: "/scan/ingredients", name: "ingredients" },
  { path: "/privacy", name: "privacy" },
  { path: "/terms", name: "terms" },
  { path: "/disclosure", name: "disclosure" },
  { path: "/support", name: "support" },
  { path: "/offline", name: "offline" },
  { path: "/product/dev-fixture-plain-oat-bars", name: "product-pass" },
  { path: "/product/dev-fixture-fruit-snacks", name: "product-fail" },
  { path: "/product/dev-fixture-unconfirmed-chips", name: "product-verify" },
] as const;

async function expectNoSeriousAxe(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (item) => item.impact === "critical" || item.impact === "serious",
  );
  expect(serious).toEqual([]);
}

test.describe("Phase 4 public routes", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium");
  });

  for (const route of routes) {
    test(`${route.name} screenshot and axe`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page
        .getByRole("heading")
        .first()
        .waitFor({ state: "visible", timeout: 20_000 });
      await page.screenshot({
        path: path.join(artifacts, `${route.name}-1280.png`),
        fullPage: true,
      });
      await expectNoSeriousAxe(page);
    });
  }

  for (const width of [320, 390, 768, 1280, 1440] as const) {
    test(`home remains usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      const overflow = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
      });
      expect(overflow).toBe(false);
    });
  }

  test("dark mode and reduced motion on rules", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/rules/arizona");
    await page.screenshot({
      path: path.join(artifacts, "rules-390-dark-reduced.png"),
      fullPage: true,
    });
    await expectNoSeriousAxe(page);
  });
});
