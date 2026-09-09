/** Offline only: reads saved evidence and writes a private review report; no database client. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { PublishedRulesetSnapshotSchema } from "../packages/contracts/src/index";
import {
  ENGINE_VERSION,
  normalizeIngredientText,
} from "../packages/compliance/src/index";
import { previewColorAliases } from "../packages/compliance/src/preview-color-aliases";

const option = (name: string) => {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  assert(value && !value.startsWith("--"), `${name} is required`);
  return value;
};
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const draft = PublishedRulesetSnapshotSchema.parse(read(option("--ruleset-file")));
const candidateFile = read(option("--candidates-file"));
const candidates = candidateFile.rows[0].snapshot.candidate_rows;
const off = read(option("--off-review-file")).entries;
assert(Array.isArray(candidates) && candidates.length > 0);
assert(Array.isArray(off) && off.length > 0);
assert.equal(new Set(candidates.map((row) => row.id)).size, candidates.length);
assert.equal(new Set(off.map((row) => row.candidateId)).size, off.length);
const candidateIds = new Set(candidates.map((row) => row.id));
const status = (matches: Array<{ precautionary: boolean }>, warnings: string[]) =>
  matches.some((match) => !match.precautionary)
    ? "FAIL"
    : matches.length || warnings.length
      ? "VERIFY"
      : "PASS";
const summarize = (text: string) => {
  const review = previewColorAliases(text, draft);
  const currentNames = [...new Set(review.currentMatches.map((m) => m.canonicalName))];
  const proposedNames = [...new Set(review.proposedMatches.map((m) => m.canonicalName))];
  return {
    inputSha256: sha256(text.trim()),
    currentScreen: status(review.currentMatches, review.parserWarnings),
    proposedScreen: status(review.proposedMatches, review.parserWarnings),
    currentNames,
    proposedNames,
    newlyRecognizedNames: proposedNames.filter((name) => !currentNames.includes(name)),
    // This broad signal is for remaining review gaps only. It never creates a match.
    numberedColorTextPresent:
      /\b(?:red (?:no )?(?:3|40)|yellow (?:no )?(?:5|6)|blue (?:no )?(?:1|2)|green (?:no )?3)\b/.test(
        normalizeIngredientText(text),
      ),
    parserWarnings: review.parserWarnings,
  };
};
const sourceReviews = candidates.map((row) => {
  assert.equal(typeof row.raw_ingredient_text, "string");
  const review = summarize(row.raw_ingredient_text);
  assert.equal(review.inputSha256, row.ingredient_text_sha256);
  return {
    candidateId: row.id,
    productName: row.product_name,
    gtin14: row.normalized_gtin14,
    sourceUrl: row.source_url,
    storedScreen: row.screen_status,
    storedRulesetHash: row.ruleset_hash,
    candidateState: row.candidate_state,
    ...review,
  };
});
const offReviews = off.map((row) => {
  assert(candidateIds.has(row.candidateId));
  const review = row.offIngredients ? summarize(row.offIngredients) : null;
  return {
    candidateId: row.candidateId,
    productName: row.productName,
    gtin14: row.gtin14,
    evidenceAttemptId: row.evidenceAttemptId,
    sourceUrl: row.sourceUrl,
    sourceModifiedAt: row.sourceModifiedAt,
    ...review,
    nextAction: !review
      ? row.reviewStatus === "RECORD_NOT_FOUND"
        ? "FIND_LICENSED_RECORD"
        : "FIND_LICENSED_INGREDIENTS"
      : review.newlyRecognizedNames.length
        ? "REVIEW_COLOR_MAPPING_AND_SOURCE_DIFFERENCES"
        : review.numberedColorTextPresent
          ? "REVIEW_REMAINING_COLOR_WORDING"
          : "COMPARE_SOURCE_IDENTITY_AND_INGREDIENTS",
  };
});
const count = (values: string[]) =>
  values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
const report = {
  reviewOnly: true,
  generatedAt: new Date().toISOString(),
  engineVersion: ENGINE_VERSION,
  baseRulesetHash: draft.rulesetHash,
  proposedRulesetHash: previewColorAliases("sugar", draft).proposedRulesetHash,
  databaseWrites: 0,
  paidAiCalls: 0,
  ownerPhotosRequired: false,
  candidateCount: sourceReviews.length,
  currentScreenCounts: count(sourceReviews.map((row) => row.currentScreen)),
  proposedScreenCounts: count(sourceReviews.map((row) => row.proposedScreen)),
  candidateScreenChanges: sourceReviews.filter(
    (row) => row.currentScreen !== row.proposedScreen,
  ).length,
  candidatesWithNewMatches: sourceReviews.filter((row) => row.newlyRecognizedNames.length)
    .length,
  offRecordsReviewed: offReviews.length,
  offNextActions: count(offReviews.map((row) => row.nextAction)),
  sourceReviews,
  offReviews,
};
writeFileSync(option("--output-file"), JSON.stringify(report, null, 2) + "\n", {
  mode: 0o600,
});
console.log(
  JSON.stringify({ ...report, sourceReviews: undefined, offReviews: undefined }, null, 2),
);
