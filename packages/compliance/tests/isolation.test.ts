import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("engine isolation", () => {
  it("does not import network, database, or UI packages", () => {
    const files = walk(join(__dirname, "../src")).filter((file) => file.endsWith(".ts"));
    const forbidden = /from ["'](next|@supabase|openai|@upstash|lucide-react|react)/;
    const offenders = files.filter((file) => forbidden.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
