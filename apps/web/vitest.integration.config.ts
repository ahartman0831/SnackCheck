import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Real storage tests make multiple network round trips and sanitize images.
    // Keep assertions intact while allowing a realistic integration deadline.
    testTimeout: 30_000,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
