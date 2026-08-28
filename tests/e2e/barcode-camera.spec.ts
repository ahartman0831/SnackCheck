import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const cameraEnabled =
  process.env.FEATURE_BARCODE_CAMERA === "true" ||
  process.env.NEXT_PUBLIC_FEATURE_BARCODE_CAMERA === "true";

async function mockMediaDevices(
  page: import("@playwright/test").Page,
  mode: "granted" | "denied" | "missing" | "insecure",
) {
  await page.addInitScript((nextMode) => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      get: () => nextMode !== "insecure",
    });
    const media = navigator.mediaDevices;
    if (!media) {
      return;
    }
    media.getUserMedia = async () => {
      if (nextMode === "denied") {
        const error = new Error("denied");
        error.name = "NotAllowedError";
        throw error;
      }
      if (nextMode === "missing") {
        const error = new Error("missing");
        error.name = "NotFoundError";
        throw error;
      }
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      return canvas.captureStream();
    };
    media.enumerateDevices = async () => [
      {
        kind: "videoinput",
        deviceId: "back",
        label: "Back camera",
        groupId: "",
        toJSON() {
          return {};
        },
      },
    ];
  }, mode);
}

function cameraAlert(page: import("@playwright/test").Page, pattern: RegExp) {
  return page.getByRole("alert").filter({ hasText: pattern });
}

test.describe("barcode camera", () => {
  test.skip(!cameraEnabled, "Camera e2e runs only when the barcode camera flag is on.");

  test("manual entry remains available while the camera is enabled", async ({ page }) => {
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
    await expect(page.getByRole("heading", { name: "Scan a barcode" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start camera" })).toBeVisible();
    await expect(page.getByLabel("Barcode numbers")).toBeVisible();
    await page.getByLabel("Barcode numbers").fill("036000291452");
    const lookup = page.waitForResponse("**/api/v1/upc/**");
    await page.getByRole("button", { name: "Look up barcode" }).click();
    await lookup;
    await expect(page).toHaveURL(/\/product\/dev-fixture-plain-oat-bars/, {
      timeout: 15_000,
    });
  });

  test("shows a denied-permission message", async ({ page }) => {
    await mockMediaDevices(page, "denied");
    await page.goto("/scan/barcode");
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(cameraAlert(page, /denied/i)).toBeVisible();
    await expect(page.getByLabel("Barcode numbers")).toBeVisible();
  });

  test("shows a missing-camera message", async ({ page }) => {
    await mockMediaDevices(page, "missing");
    await page.goto("/scan/barcode");
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(cameraAlert(page, /No camera/i)).toBeVisible();
  });

  test("shows an insecure-context message", async ({ page }) => {
    await mockMediaDevices(page, "insecure");
    await page.goto("/scan/barcode");
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(cameraAlert(page, /secure page/i)).toBeVisible();
  });

  test("granted camera can be cancelled and tracks are released", async ({ page }) => {
    await mockMediaDevices(page, "granted");
    await page.goto("/scan/barcode");
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(page.getByRole("button", { name: "Cancel camera" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel camera" }).click();
    await expect(page.getByRole("button", { name: "Start camera" })).toBeVisible();
    await expect(page.getByLabel("Barcode numbers")).toBeVisible();
  });

  test("camera-on barcode page has no serious accessibility issues", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    await page.goto("/scan/barcode");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (item) => item.impact === "critical" || item.impact === "serious",
    );
    expect(serious).toEqual([]);
  });
});
