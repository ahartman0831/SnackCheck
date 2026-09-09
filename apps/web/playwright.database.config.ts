import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://127.0.0.1:3100";
const app = new URL(baseURL);
const upstream = "http://127.0.0.1:3101";
const database = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://unconfigured.invalid",
);
if (
  app.protocol !== "https:" ||
  ![app, database].every((url) => ["127.0.0.1", "localhost"].includes(url.hostname))
) {
  throw new Error(
    "Database browser tests require an explicitly configured disposable local Supabase and local application.",
  );
}

export default defineConfig({
  testDir: "../../tests/e2e",
  testMatch: "**/takeover-journey.spec.ts",
  workers: 1,
  retries: 0,
  use: { baseURL, ignoreHTTPSErrors: true, trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter web exec next start --hostname 127.0.0.1 --port 3101",
      url: upstream,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `node ../../scripts/serve-local-test-https.mjs ${baseURL} ${upstream}`,
      url: baseURL,
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
    { name: "mobile-webkit", use: { ...devices["iPhone 14"] } },
  ],
});
