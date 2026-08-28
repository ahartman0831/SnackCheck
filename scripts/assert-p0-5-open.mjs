import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  "pnpm",
  ["--filter", "web", "exec", "vitest", "run", "tests/unit/p0-submission-token.test.ts"],
  { cwd: root, stdio: "inherit", env: process.env },
);

if (result.status === 0) {
  console.error("P0-5 unexpectedly passed. Keep this gate red until Phase 6.");
  process.exit(1);
}

if (result.status !== 1) {
  console.error(`P0-5 test exited ${result.status}; expected a failing assertion (1).`);
  process.exit(1);
}

console.log("P0-5 remains open, as required until Phase 6.");
