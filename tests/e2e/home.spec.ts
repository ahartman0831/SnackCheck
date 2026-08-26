import { test, expect } from "@playwright/test";

test("home page is reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Can I Bring This?" })).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
});
