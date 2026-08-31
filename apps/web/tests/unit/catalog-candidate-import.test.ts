import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { arizonaRuleset } from "@snackcheck/compliance";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLY_CONFIRMATION,
  assertCandidateApplyAllowed,
  runUsdaCandidateImport,
  type CandidateBatchInput,
  type CandidateWriter,
} from "@/lib/catalog-candidates/candidate-import";
import { streamUsdaBrandedCandidates } from "@/lib/catalog-candidates/usda-adapter";

const fixturePath = resolve(process.cwd(), "tests/fixtures/usda-branded-synthetic.csv");

async function fixtureText(): Promise<string> {
  return readFile(fixturePath, "utf8");
}

async function* awkwardChunks(text: string): AsyncGenerator<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  for (let offset = 0; offset < bytes.length; offset += 17) {
    yield bytes.slice(offset, offset + 17);
  }
}

const batch: CandidateBatchInput = {
  provider: "USDA_FDC",
  datasetRelease: "synthetic-2026-08",
  sourceUrl: "https://fdc.nal.usda.gov/download-datasets/",
  licenseIdentifier: "CC0-1.0",
  fileSha256: "a".repeat(64),
  fileByteSize: 512,
  mode: "DRY_RUN",
  parserVersion: "usda-branded-csv-v1",
  normalizerVersion: "gtin-v1",
  engineVersion: "0.1.0",
  rulesetHash: arizonaRuleset().rulesetHash,
};

describe("USDA catalog candidate foundation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("streams quoted CSV chunks and maps only structurally eligible US records", async () => {
    const results = [];
    for await (const result of streamUsdaBrandedCandidates(
      awkwardChunks(await fixtureText()),
      arizonaRuleset(),
    )) {
      results.push(result);
    }

    expect(results).toHaveLength(7);
    expect(results[0]).toMatchObject({
      kind: "accepted",
      record: {
        externalRecordId: "1001",
        normalizedGtin14: "00012345678905",
        screenStatus: "PASS",
        licenseIdentifier: "CC0-1.0",
      },
    });
    expect(results[1]).toMatchObject({
      kind: "accepted",
      record: { externalRecordId: "1001", screenStatus: "FAIL", matchedRuleIds: ["s3"] },
    });
    expect(
      results.slice(3).map((result) => result.kind === "rejected" && result.category),
    ).toEqual(["INVALID_GTIN", "MISSING_INGREDIENTS", "NON_US_MARKET", "DISCONTINUED"]);
  });

  it("keeps dry runs write-free and reports privacy-safe categories", async () => {
    const writer: CandidateWriter = {
      createBatch: vi.fn(() => Promise.reject(new Error("must not write"))),
      importRecord: vi.fn(() => Promise.reject(new Error("must not write"))),
      completeBatch: vi.fn(() => Promise.reject(new Error("must not write"))),
    };
    const summary = await runUsdaCandidateImport(
      awkwardChunks(await fixtureText()),
      arizonaRuleset(),
      batch,
      { apply: false, maxRows: 100 },
      writer,
    );

    expect(summary).toEqual({
      dryRun: true,
      rowsRead: 7,
      rowsAccepted: 2,
      rowsRejected: 5,
      rowsUnchanged: 0,
      rowsSuperseded: 0,
      errorCounts: {
        DUPLICATE_IN_FILE: 1,
        INVALID_GTIN: 1,
        MISSING_INGREDIENTS: 1,
        NON_US_MARKET: 1,
        DISCONTINUED: 1,
      },
    });
    expect(writer.createBatch).not.toHaveBeenCalled();
  });

  it("requires an explicit bounded staging confirmation before apply", () => {
    expect(() =>
      assertCandidateApplyAllowed({ apply: true, target: "production", maxRows: 100 }),
    ).toThrow("staging target");
    expect(() =>
      assertCandidateApplyAllowed({ apply: true, target: "staging", maxRows: 100 }),
    ).toThrow(APPLY_CONFIRMATION);
    expect(() =>
      assertCandidateApplyAllowed({
        apply: true,
        target: "staging",
        confirmation: APPLY_CONFIRMATION,
        maxRows: 10_001,
      }),
    ).toThrow("between 1 and 10,000");

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stagingfixture.supabase.co");
    vi.stubEnv("CATALOG_STAGING_SUPABASE_PROJECT_REF", "stagingfixture");
    expect(() =>
      assertCandidateApplyAllowed({
        apply: true,
        target: "staging",
        confirmation: APPLY_CONFIRMATION,
        maxRows: 100,
      }),
    ).not.toThrow();

    vi.stubEnv("CATALOG_PRODUCTION_SUPABASE_PROJECT_REF", "stagingfixture");
    expect(() =>
      assertCandidateApplyAllowed({
        apply: true,
        target: "staging",
        confirmation: APPLY_CONFIRMATION,
        maxRows: 100,
      }),
    ).toThrow("production Supabase project");
  });
});
