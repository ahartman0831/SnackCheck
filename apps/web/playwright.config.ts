import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const preview = new URL(baseURL);
const chromiumChannel = process.env.CI ? undefined : "chrome";
const serverCommand = process.env.CI
  ? `pnpm --filter web exec next start --hostname ${preview.hostname} --port ${preview.port || "80"}`
  : `pnpm --filter web exec next dev --hostname ${preview.hostname} --port ${preview.port || "80"}`;

export default defineConfig({
  testDir: "../../tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DEV_CATALOG_ENABLED: "true",
    },
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        ...(chromiumChannel ? { channel: chromiumChannel } : {}),
      },
    },
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
