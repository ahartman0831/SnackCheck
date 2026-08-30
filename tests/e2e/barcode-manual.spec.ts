import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("manual barcode fallback", () => {
  test("keeps typed entry usable without a camera claim when the flag is off", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => true,
      });
    });
    await page.route("**/api/v1/upc/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { lookup: { result: { slug: "dev-fixture-plain-oat-bars" } } },
          meta: { requestId: "e2e" },
        }),
      });
    });
    await page.goto("/scan/barcode");
    await expect(page.getByRole("heading", { name: "Enter a barcode" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start camera" })).toHaveCount(0);
    await expect(page.getByLabel("Barcode numbers")).toBeVisible();
    await page.getByLabel("Barcode numbers").fill("036000291452");
    const lookup = page.waitForResponse("**/api/v1/upc/**");
    await page.getByRole("button", { name: "Look up barcode" }).click();
    await lookup;
    await expect(page).toHaveURL(/\/product\/dev-fixture-plain-oat-bars/, {
      timeout: 15_000,
    });
  });

  test("barcode page has no serious accessibility issues", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    await page.goto("/scan/barcode");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (item) => item.impact === "critical" || item.impact === "serious",
    );
    expect(serious).toEqual([]);
  });
});
