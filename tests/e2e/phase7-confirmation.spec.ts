import { expect, test, type Page } from "@playwright/test";

const submissionId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const extraction = {
  panelFound: true,
  rawText: "Sugar, salt",
  ingredientText: "Sugar, salt",
  ingredients: [],
  overallConfidence: 0.68,
  warnings: ["GLARE"],
};

async function mockSubmission(page: Page) {
  await page.route(`**/api/v1/submissions/${submissionId}`, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 200, body: "{}" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { extraction, confidence: 0.68, imageUrl: null },
        meta: { requestId: "e2e" },
      }),
    });
  });
}

test.describe("Phase 7 confirmation", () => {
  test("keeps human correction ahead of deterministic evaluation", async ({ page }) => {
    await mockSubmission(page);
    let confirmedText = "";
    await page.route(`**/api/v1/submissions/${submissionId}/confirm`, async (route) => {
      confirmedText = (await route.request().postDataJSON()).correctedText;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            confirmed: true,
            result: {
              ingredientStatus: "VERIFY",
              applicabilityStatus: "UNKNOWN",
              localPolicyStatus: "NOT_REQUESTED",
              matchedRules: [],
              qualityFlags: ["UNCONFIRMED_EVIDENCE"],
              rulesetHash: "",
              formulationHash: "f".repeat(64),
              engineVersion: "e2e",
              evaluatedAt: "2026-08-28T00:00:00.000Z",
              explanation: {
                headline: "Verify before relying on this",
                summary: "A trustworthy current determination is not possible.",
                contextSummary: "Applicability is unknown.",
                localPolicySummary: "School participation not verified.",
              },
            },
          },
          meta: { requestId: "e2e" },
        }),
      });
    });

    await page.goto(`/scan/confirm/${submissionId}`);
    const field = page.getByLabel("Ingredient text");
    await expect(field).toHaveValue("Sugar, salt");
    await expect(page.getByText(/review carefully/i)).toBeVisible();
    await field.fill("Sugar, sea salt");
    await page.getByRole("button", { name: "Confirm and check" }).click();

    await expect(
      page.getByRole("heading", { name: "Verify this package" }),
    ).toBeVisible();
    expect(confirmedText).toBe("Sugar, sea salt");
  });

  test("preserves corrections through an offline confirmation failure", async ({
    page,
    context,
  }) => {
    await mockSubmission(page);
    await page.goto(`/scan/confirm/${submissionId}`);
    const field = page.getByLabel("Ingredient text");
    await field.fill("Corrected while reviewing");
    await context.setOffline(true);
    await page.getByRole("button", { name: "Confirm and check" }).click();

    await expect(page.getByText(/you're offline/i)).toBeVisible();
    await expect(field).toHaveValue("Corrected while reviewing");
    await context.setOffline(false);
  });
});
