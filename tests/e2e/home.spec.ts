import { test, expect } from "@playwright/test";

test("home page is reachable", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Start with the ingredients." }),
  ).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
});
