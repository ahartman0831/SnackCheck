import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectNoSeriousAxe(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (item) => item.impact === "critical" || item.impact === "serious",
    ),
  ).toEqual([]);
}

test.describe("What can I bring discovery", () => {
  test("fails closed honestly without a published ruleset", async ({ page }) => {
    await page.goto("/approved");
    await expect(page.getByRole("heading", { name: "What can I bring?" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Arizona ruleset is under review" }),
    ).toBeVisible();
    await expect(page.getByText(/No current passing products yet/)).toHaveCount(0);
    await expectNoSeriousAxe(page);
  });

  test("keeps category links canonical and fail-closed", async ({ page }) => {
    await page.goto("/approved/fruit-snacks");
    await expect(page).toHaveURL(/\/approved\?category=fruit-snacks$/);
    await expect(
      page.getByRole("heading", { name: "Arizona ruleset is under review" }),
    ).toBeVisible();
    await expectNoSeriousAxe(page);
  });

  test("keeps missing-product requests in the confirmed ingredient flow", async ({
    page,
  }) => {
    await page.goto("/scan/ingredients?request=product&q=missing+snack");
    await expect(page.getByText("Request a product check")).toBeVisible();
    await expect(
      page.getByText(/does not automatically publish or approve/),
    ).toBeVisible();
    await expect(page.getByLabel("Ingredient list")).toBeVisible();
    await expectNoSeriousAxe(page);
  });

  test("explains that a package-change report waits for review", async ({ page }) => {
    await page.goto("/scan/ingredients?request=package-change&product=example-product");
    await expect(page.getByText("Report a package change")).toBeVisible();
    await expect(
      page.getByText(/does not replace the current catalog record unless/),
    ).toBeVisible();
    await expectNoSeriousAxe(page);
  });
});
