import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outFile = resolve(process.cwd(), "packages/db-types/src/database.types.ts");
const failClosed =
  process.env.CI === "true" || process.env.SUPABASE_TYPES_REQUIRED === "true";

try {
  const types = execFileSync("supabase", ["gen", "types", "typescript", "--local"], {
    encoding: "utf8",
  });
  writeFileSync(outFile, `${types.trimEnd()}\n`);
  console.log(`Wrote generated Database types to ${outFile}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (failClosed) {
    throw new Error(
      `Local database type generation is required in CI. Do not generate types from a remote project. ${message}`,
    );
  }
  console.warn(
    "supabase gen types --local failed; keeping the committed Database types.",
    message,
  );
}
