import { expect, type APIRequestContext } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { arizonaRuleset } from "../../packages/compliance/src/index";
import { streamUsdaBrandedCandidates } from "../../apps/web/lib/catalog-candidates/usda-adapter";

// Uses the real importer and protected RPCs, exclusively in the disposable local test database.
export async function seedCatalogReviewFixture(request: APIRequestContext) {
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!["127.0.0.1", "localhost"].includes(new URL(api).hostname))
    throw new Error("Catalog browser fixtures require a disposable local database");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  async function rpc(name: string, data: Record<string, unknown>) {
    const response = await request.post(`${api}/rest/v1/rpc/${name}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      data,
    });
    const body = await response.text();
    expect(response.ok(), `${name}: ${body}`).toBe(true);
    return body.trim() ? JSON.parse(body) : null;
  }
  const csv = `fdc_id,gtin_upc,brand_name,description,ingredients,market_country,modified_date\n${randomUUID()},012345678905,Test Fixture,Fixture grain crackers,"oats, sugar, salt",United States,2026-09-01\n`;
  async function* chunks() {
    yield csv;
  }
  const records = [];
  for await (const result of streamUsdaBrandedCandidates(chunks(), arizonaRuleset())) {
    if (result.kind === "accepted") records.push(result.record);
  }
  expect(records).toHaveLength(1);
  const record = records[0];
  const hash = createHash("sha256").update(csv).digest("hex");
  const batchId = await rpc("create_catalog_import_batch", {
    p_batch: {
      provider: "USDA_FDC",
      datasetRelease: "browser-fixture",
      sourceUrl: "https://fdc.nal.usda.gov/download-datasets/",
      licenseIdentifier: "CC0-1.0",
      fileSha256: hash,
      fileByteSize: Buffer.byteLength(csv),
      mode: "APPLY",
      parserVersion: "usda-branded-csv-v1",
      normalizerVersion: "gtin-v1",
      engineVersion: record.engineVersion,
      rulesetHash: record.rulesetHash,
    },
  });
  const imported = await rpc("import_catalog_source_record", {
    p_record: { ...record, importBatchId: batchId },
  });
  const id = imported.recordId as string;
  await rpc("complete_catalog_import_batch", {
    p_batch_id: batchId,
    p_summary: {
      status: "COMPLETED",
      rowsRead: 1,
      rowsAccepted: 1,
      rowsRejected: 0,
      rowsUnchanged: 0,
      rowsSuperseded: 0,
      errorCounts: {},
    },
  });
  await rpc("apply_catalog_relevance_assessments", {
    p_assessments: [
      {
        id,
        version: "classroom-use-v3",
        group: "SNACKS",
        score: 80,
        tier: "HIGH",
        route: "AUTO_EVIDENCE",
        reasons: ["CLASSROOM_CATEGORY_SNACKS"],
      },
    ],
    p_run: {
      algorithmVersion: "classroom-use-v3",
      assessedCount: 1,
      selectionHash: hash,
      corpusHash: hash,
      runId: randomUUID(),
      batchIndex: 0,
      batchCount: 1,
    },
    p_confirmation: "APPLY_CLASSROOM_RELEVANCE_TO_STAGING",
  });
  await rpc("queue_catalog_candidate_shortlist", {
    p_candidate_ids: [id],
    p_run: {
      algorithmVersion: "classroom-use-v3",
      targetCount: 1,
      selectionHash: hash,
      runId: randomUUID(),
      groupCounts: { SNACKS: 1 },
    },
    p_confirmation: "QUEUE_CATALOG_SHORTLIST_TO_STAGING",
  });
  const runId = randomUUID();
  await rpc("begin_catalog_evidence_run", {
    p_run: {
      runId,
      collectorVersion: "catalog-evidence-v1",
      sourcePolicyVersion: "evidence-source-v1",
      selectionHash: hash,
      maxRequestsPerCandidate: 1,
      maxRequestsPerRun: 1,
      maxResponseBytes: 250000,
    },
    p_candidate_ids: [id],
    p_confirmation: "COLLECT_CATALOG_EVIDENCE_TO_STAGING",
  });
  const text = JSON.stringify({
    code: "012345678905",
    productName: "Fixture grain crackers",
    brands: "Test Fixture",
    quantity: "30g",
    ingredientText: "oats, sunflower oil, salt",
  });
  await rpc("record_catalog_evidence_attempt", {
    p_run_id: runId,
    p_attempt: {
      candidateId: id,
      outcome: "EVIDENCE_FOUND",
      reasonCode: "ALLOWED_SOURCE_RETRIEVED",
      requestCount: 1,
      evidence: {
        sourceKind: "SECONDARY",
        url: "https://world.openfoodfacts.org/api/v3/product/12345678905",
        hostname: "world.openfoodfacts.org",
        title: "Saved fixture ingredient record",
        retrievedAt: new Date().toISOString(),
        observedAt: "2026-09-01T00:00:00Z",
        contentSha256: createHash("sha256").update(text).digest("hex"),
        byteSize: Buffer.byteLength(text),
        mediaType: "application/json",
        licenseIdentifier: "ODbL-1.0; DbCL-1.0",
        attribution: "Test fixture for Open Food Facts record format",
        ingredientText: null,
        evidenceText: text,
      },
    },
  });
  await rpc("complete_catalog_evidence_run", { p_run_id: runId, p_status: "COMPLETED" });
  return id;
}
