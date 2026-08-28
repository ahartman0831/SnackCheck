import { test, expect } from "@playwright/test";

test("home page is reachable", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Scan it. Search it. Know before you bring it." }),
  ).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
});
