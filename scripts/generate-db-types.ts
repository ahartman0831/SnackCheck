import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outFile = resolve(process.cwd(), "packages/db-types/src/database.types.ts");

try {
  const types = execFileSync("supabase", ["gen", "types", "typescript", "--linked"], {
    encoding: "utf8",
  });
  writeFileSync(outFile, types);
  console.log(`Wrote generated Database types to ${outFile}`);
} catch (error) {
  console.warn(
    "supabase gen types failed; keeping the committed Database types.",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 0;
}
