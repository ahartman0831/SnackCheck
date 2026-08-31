import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createGunzip } from "node:zlib";
import { ENGINE_VERSION } from "@snackcheck/compliance";
import { PublishedRulesetSnapshotSchema } from "@snackcheck/contracts";
import { createClient } from "@supabase/supabase-js";
import {
  runUsdaCandidateImport,
  type CandidateBatchInput,
  type CandidateImportSummary,
  type CandidateWriter,
} from "../lib/catalog-candidates/candidate-import";
import {
  USDA_ADAPTER_VERSION,
  USDA_LICENSE,
} from "../lib/catalog-candidates/usda-adapter";

interface Args {
  file: string;
  rulesetFile: string;
  datasetRelease: string;
  sourceUrl: string;
  apply: boolean;
  target?: string;
  confirmation?: string;
  maxRows: number;
}

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function parseArgs(argv: string[]): Args {
  const file = option(argv, "--file");
  const rulesetFile = option(argv, "--ruleset-file");
  const datasetRelease = option(argv, "--dataset-release");
  if (!file || !rulesetFile || !datasetRelease) {
    throw new Error(
      "Usage: pnpm import:candidates --file <USDA.csv|USDA.csv.gz> --ruleset-file <snapshot.json> --dataset-release <release> [--dry-run|--apply --target staging --confirm IMPORT_CATALOG_CANDIDATES_TO_STAGING] [--max-rows 100]",
    );
  }
  const maxRows = Number(option(argv, "--max-rows") ?? "1000");
  if (!Number.isInteger(maxRows) || maxRows < 1)
    throw new Error("--max-rows must be a positive integer");
  return {
    file,
    rulesetFile,
    datasetRelease,
    sourceUrl:
      option(argv, "--source-url") ?? "https://fdc.nal.usda.gov/download-datasets/",
    apply: argv.includes("--apply"),
    target: option(argv, "--target"),
    confirmation: option(argv, "--confirm"),
    maxRows,
  };
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function sourceStream(path: string): AsyncIterable<Uint8Array> {
  const stream = createReadStream(path);
  return path.endsWith(".gz") ? stream.pipe(createGunzip()) : stream;
}

function createWriter(): CandidateWriter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Staging Supabase URL and service role key are required for apply mode.",
    );
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });
  return {
    async createBatch(input): Promise<string> {
      const { data, error } = await admin.rpc("create_catalog_import_batch", {
        p_batch: input,
      });
      if (error) throw new Error(error.message);
      if (typeof data !== "string") throw new Error("Import batch did not return an id.");
      return data;
    },
    async importRecord(input) {
      const { data, error } = await admin.rpc("import_catalog_source_record", {
        p_record: input,
      });
      if (error) throw new Error(error.message);
      const result = data as { action?: string; superseded?: number } | null;
      if (result?.action !== "created" && result?.action !== "unchanged") {
        throw new Error("Candidate import returned an invalid outcome.");
      }
      return { action: result.action, superseded: result.superseded ?? 0 };
    },
    async completeBatch(batchId, input) {
      const { error } = await admin.rpc("complete_catalog_import_batch", {
        p_batch_id: batchId,
        p_summary: input,
      });
      if (error) throw new Error(error.message);
    },
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const invocationRoot = process.env.INIT_CWD ?? process.cwd();
  const filePath = resolve(invocationRoot, args.file);
  const rulesetPath = resolve(invocationRoot, args.rulesetFile);
  const ruleset = PublishedRulesetSnapshotSchema.parse(
    JSON.parse(await readFile(rulesetPath, "utf8")),
  );
  const fileStats = await stat(filePath);
  const batch: CandidateBatchInput = {
    provider: "USDA_FDC",
    datasetRelease: args.datasetRelease,
    sourceUrl: args.sourceUrl,
    licenseIdentifier: USDA_LICENSE,
    fileSha256: await hashFile(filePath),
    fileByteSize: fileStats.size,
    mode: args.apply ? "APPLY" : "DRY_RUN",
    parserVersion: USDA_ADAPTER_VERSION,
    normalizerVersion: "gtin-v1",
    engineVersion: ENGINE_VERSION,
    rulesetHash: ruleset.rulesetHash,
  };
  const writer = args.apply ? createWriter() : undefined;
  const summary: CandidateImportSummary = await runUsdaCandidateImport(
    sourceStream(filePath),
    ruleset,
    batch,
    {
      apply: args.apply,
      target: args.target,
      confirmation: args.confirmation,
      maxRows: args.maxRows,
    },
    writer,
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Candidate import failed.");
  process.exit(1);
});
