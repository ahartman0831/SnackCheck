import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function databaseTestsPassed(status, output) {
  const counts = output.match(/Files=(\d+),\s*Tests=(\d+)/);
  return (
    status === 0 &&
    Boolean(counts) &&
    Number(counts[1]) > 0 &&
    Number(counts[2]) > 0 &&
    /Result: PASS/.test(output) &&
    !/^not ok\b/m.test(output)
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = spawnSync("supabase", ["test", "db", ...process.argv.slice(2)], {
    encoding: "utf8",
  });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  process.stdout.write(output);
  if (!databaseTestsPassed(result.status, output)) {
    console.error(
      "Database verification requires a non-empty passing pgTAP suite. A zero-test run is not success.",
    );
    process.exitCode = 1;
  }
}
