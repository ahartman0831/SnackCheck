import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const seed = readFileSync(resolve(process.cwd(), "supabase/seed.sql"), "utf8");
if (!seed.includes("not allowed in production")) {
  console.error("seed.sql must be environment-guarded");
  process.exit(1);
}
if (/insert into public\.products/i.test(seed)) {
  console.error("seed.sql must not insert production-like products");
  process.exit(1);
}
console.log("Seed verification: development seed is guarded and contains no products.");
