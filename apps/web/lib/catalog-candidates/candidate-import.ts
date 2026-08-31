import type {
  CatalogImportErrorCategory,
  CatalogSourceRecord,
  PublishedRulesetSnapshot,
} from "@snackcheck/contracts";
import { streamUsdaBrandedCandidates, type CsvChunk } from "./usda-adapter";

export const APPLY_CONFIRMATION = "IMPORT_CATALOG_CANDIDATES_TO_STAGING";

export interface CandidateBatchInput {
  provider: "USDA_FDC";
  datasetRelease: string;
  sourceUrl: string;
  licenseIdentifier: string;
  fileSha256: string;
  fileByteSize: number;
  mode: "DRY_RUN" | "APPLY";
  parserVersion: string;
  normalizerVersion: string;
  engineVersion: string;
  rulesetHash: string;
}

export interface CandidateImportSummary {
  dryRun: boolean;
  rowsRead: number;
  rowsAccepted: number;
  rowsRejected: number;
  rowsUnchanged: number;
  rowsSuperseded: number;
  errorCounts: Partial<Record<CatalogImportErrorCategory, number>>;
}

export interface CandidateWriter {
  createBatch(input: CandidateBatchInput): Promise<string>;
  importRecord(
    input: CatalogSourceRecord & { importBatchId: string },
  ): Promise<{ action: "created" | "unchanged"; superseded: number }>;
  completeBatch(
    batchId: string,
    input: CandidateImportSummary & { status: "COMPLETED" | "FAILED" },
  ): Promise<void>;
}

export interface CandidateImportOptions {
  apply: boolean;
  confirmation?: string;
  target?: string;
  maxRows: number;
}

export function assertCandidateApplyAllowed(options: CandidateImportOptions): void {
  if (!options.apply) return;
  if (options.target !== "staging")
    throw new Error("Apply mode requires the staging target.");
  if (options.confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`Apply mode requires --confirm ${APPLY_CONFIRMATION}.`);
  }
  if (
    !Number.isInteger(options.maxRows) ||
    options.maxRows < 1 ||
    options.maxRows > 10_000
  ) {
    throw new Error("Apply mode requires a max row limit between 1 and 10,000.");
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "Candidate imports are forbidden in the production Vercel environment.",
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const productionProjectRef = process.env.CATALOG_PRODUCTION_SUPABASE_PROJECT_REF ?? "";
  if (productionProjectRef && url.includes(`://${productionProjectRef}.`)) {
    throw new Error(
      "Candidate imports are forbidden for the production Supabase project.",
    );
  }
  const stagingProjectRef = process.env.CATALOG_STAGING_SUPABASE_PROJECT_REF ?? "";
  if (!stagingProjectRef || !url.includes(`://${stagingProjectRef}.`)) {
    throw new Error(
      "Apply mode requires CATALOG_STAGING_SUPABASE_PROJECT_REF to match the staging URL.",
    );
  }
}

export async function runUsdaCandidateImport(
  chunks: AsyncIterable<CsvChunk>,
  ruleset: PublishedRulesetSnapshot,
  batch: CandidateBatchInput,
  options: CandidateImportOptions,
  writer?: CandidateWriter,
): Promise<CandidateImportSummary> {
  assertCandidateApplyAllowed(options);
  if (options.apply && !writer)
    throw new Error("Apply mode requires a candidate writer.");
  if (batch.mode !== (options.apply ? "APPLY" : "DRY_RUN")) {
    throw new Error("Import batch mode does not match the requested operation.");
  }

  const summary: CandidateImportSummary = {
    dryRun: !options.apply,
    rowsRead: 0,
    rowsAccepted: 0,
    rowsRejected: 0,
    rowsUnchanged: 0,
    rowsSuperseded: 0,
    errorCounts: {},
  };
  const seen = new Set<string>();
  const batchId = options.apply ? await writer!.createBatch(batch) : null;

  try {
    for await (const result of streamUsdaBrandedCandidates(chunks, ruleset)) {
      if (summary.rowsRead >= options.maxRows) break;
      summary.rowsRead += 1;
      if (result.kind === "rejected") {
        summary.rowsRejected += 1;
        summary.errorCounts[result.category] =
          (summary.errorCounts[result.category] ?? 0) + 1;
        continue;
      }
      const key = `${result.record.provider}:${result.record.externalRecordId}:${result.record.sourceVersion}:${result.record.sourceRecordSha256}`;
      if (seen.has(key)) {
        summary.rowsRejected += 1;
        summary.errorCounts.DUPLICATE_IN_FILE =
          (summary.errorCounts.DUPLICATE_IN_FILE ?? 0) + 1;
        continue;
      }
      seen.add(key);
      summary.rowsAccepted += 1;
      if (batchId) {
        const outcome = await writer!.importRecord({
          ...result.record,
          importBatchId: batchId,
        });
        if (outcome.action === "unchanged") summary.rowsUnchanged += 1;
        summary.rowsSuperseded += outcome.superseded;
      }
    }
    if (batchId)
      await writer!.completeBatch(batchId, { ...summary, status: "COMPLETED" });
    return summary;
  } catch (error) {
    if (batchId) await writer!.completeBatch(batchId, { ...summary, status: "FAILED" });
    throw error;
  }
}
