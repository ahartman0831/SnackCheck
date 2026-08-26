import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const seed = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0015_arizona_regulatory_seed.sql"),
  "utf8",
);

const required = [
  "A.R.S. § 15-242.01",
  "Arizona Laws 2025, Chapter 52 / HB 2164",
  "ADE May 5, 2026 compliance memorandum",
  "ADE May 2026 administrator resource and FAQ",
  "Potassium bromate",
  "Propylparaben",
  "Titanium dioxide",
  "Brominated vegetable oil",
  "Yellow dye 5",
  "Yellow dye 6",
  "Blue dye 1",
  "Blue dye 2",
  "Green dye 3",
  "Red dye 3",
  "Red dye 40",
  "PENDING_REVIEW",
  "Allura Red AC",
];

const missing = required.filter((value) => !seed.includes(value));
if (missing.length > 0) {
  console.error("Missing required provenance fields:", missing.join(", "));
  process.exit(1);
}

if (seed.includes("enabled") && seed.includes("Allura Red AC")) {
  const pendingBlock = seed.slice(seed.indexOf("Allura Red AC"));
  if (!pendingBlock.includes("PENDING_REVIEW")) {
    console.error("Allura Red AC must remain pending review");
    process.exit(1);
  }
}

console.log(
  "Regulatory provenance checker: required source and substance rows are present.",
);
