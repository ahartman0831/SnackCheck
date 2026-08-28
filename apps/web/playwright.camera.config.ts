import { defineConfig, devices } from "@playwright/test";

process.env.FEATURE_BARCODE_CAMERA = "true";
process.env.NEXT_PUBLIC_FEATURE_BARCODE_CAMERA = "true";

const baseURL = process.env.PLAYWRIGHT_CAMERA_BASE_URL ?? "http://127.0.0.1:3010";
const preview = new URL(baseURL);
const chromiumChannel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "../../tests/e2e",
  testMatch: "**/barcode-camera.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm --filter web exec next dev --hostname ${preview.hostname} --port ${preview.port || "80"}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DEV_CATALOG_ENABLED: "true",
      FEATURE_BARCODE_CAMERA: "true",
      NEXT_PUBLIC_FEATURE_BARCODE_CAMERA: "true",
    },
  },
  projects: [
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromiumChannel ? { channel: chromiumChannel } : {}),
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
