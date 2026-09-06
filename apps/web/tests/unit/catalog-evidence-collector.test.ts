import { describe, expect, it, vi } from "vitest";
import {
  collectCatalogEvidence,
  type EvidenceCandidate,
  type EvidenceCollectionAdapter,
} from "@/lib/catalog-evidence/collector";

const candidate: EvidenceCandidate = {
  id: "candidate-1",
  provider: "USDA_FDC",
  brand: "Fixture Foods",
  productName: "Pretzel Bites",
  variant: null,
  size: "1 oz",
  normalizedGtin14: "00012345678905",
  manufacturerHosts: ["fixturefoods.example"],
};

function adapter(
  overrides: Partial<EvidenceCollectionAdapter> = {},
): EvidenceCollectionAdapter {
  return {
    discover: vi.fn().mockResolvedValue({
      requestCount: 1,
      references: [
        { url: "https://fixturefoods.example/pretzels", title: "Pretzel Bites" },
      ],
    }),
    retrieve: vi.fn().mockResolvedValue({
      requestCount: 1,
      evidence: {
        url: "https://fixturefoods.example/pretzels",
        title: "Pretzel Bites",
        retrievedAt: "2026-09-06T00:00:00.000Z",
        observedAt: null,
        contentSha256: "a".repeat(64),
        byteSize: 1200,
        mediaType: "text/html",
        licenseIdentifier: null,
        attribution: "Fixture Foods",
        ingredientText: "Wheat flour, salt",
        evidenceText: "Fixture Foods Pretzel Bites Wheat flour, salt",
      },
    }),
    ...overrides,
  };
}

describe("catalog evidence collector", () => {
  it("collects allowed evidence in dry-run mode without writing", async () => {
    const writer = { saveAttempt: vi.fn() };
    const result = await collectCatalogEvidence({
      runId: "run-1",
      candidates: [candidate],
      adapter: adapter(),
      writer,
    });
    expect(result).toMatchObject({
      dryRun: true,
      candidatesAttempted: 1,
      requestsMade: 2,
      evidenceFound: 1,
    });
    expect(result.attempts[0].evidence).toMatchObject({ sourceKind: "MANUFACTURER" });
    expect(writer.saveAttempt).not.toHaveBeenCalled();
  });

  it("blocks retailer-only results before retrieval", async () => {
    const evidenceAdapter = adapter({
      discover: vi.fn().mockResolvedValue({
        requestCount: 1,
        references: [{ url: "https://amazon.com/item", title: "Retail listing" }],
      }),
    });
    const result = await collectCatalogEvidence({
      runId: "run-2",
      candidates: [candidate],
      adapter: evidenceAdapter,
    });
    expect(result.attempts[0]).toMatchObject({
      outcome: "BLOCKED_BY_POLICY",
      reasonCode: "NO_ALLOWED_SOURCE",
    });
    expect(evidenceAdapter.retrieve).not.toHaveBeenCalled();
  });

  it("enforces request and response-size limits", async () => {
    const requestLimited = await collectCatalogEvidence({
      runId: "run-3",
      candidates: [candidate],
      adapter: adapter({
        discover: vi.fn().mockResolvedValue({ requestCount: 3, references: [] }),
      }),
      limits: { maxRequestsPerCandidate: 2 },
    });
    expect(requestLimited.attempts[0].outcome).toBe("REQUEST_LIMIT_REACHED");

    const oversized = await collectCatalogEvidence({
      runId: "run-4",
      candidates: [candidate],
      adapter: adapter({
        retrieve: vi.fn().mockResolvedValue({
          requestCount: 1,
          evidence: {
            url: "https://fixturefoods.example/pretzels",
            title: "Pretzel Bites",
            retrievedAt: "2026-09-06T00:00:00.000Z",
            observedAt: null,
            contentSha256: "a".repeat(64),
            byteSize: 501,
            mediaType: "text/html",
            licenseIdentifier: null,
            attribution: null,
            ingredientText: null,
            evidenceText: "",
          },
        }),
      }),
      limits: { maxResponseBytes: 500 },
    });
    expect(oversized.attempts[0]).toMatchObject({
      outcome: "BLOCKED_BY_POLICY",
      reasonCode: "RESPONSE_TOO_LARGE",
    });
  });

  it("rejects a redirect to an untrusted final host", async () => {
    const result = await collectCatalogEvidence({
      runId: "run-redirect",
      candidates: [candidate],
      adapter: adapter({
        retrieve: vi.fn().mockResolvedValue({
          requestCount: 1,
          evidence: {
            url: "https://amazon.com/redirected-item",
            title: "Pretzel Bites",
            retrievedAt: "2026-09-06T00:00:00.000Z",
            observedAt: null,
            contentSha256: "a".repeat(64),
            byteSize: 1200,
            mediaType: "text/html",
            licenseIdentifier: null,
            attribution: null,
            ingredientText: "Wheat flour, salt",
            evidenceText: "Wheat flour, salt",
          },
        }),
      }),
    });
    expect(result.attempts[0]).toMatchObject({
      outcome: "BLOCKED_BY_POLICY",
      reasonCode: "FINAL_URL_NOT_ALLOWED",
    });
  });

  it("requires a writer for apply and saves one explicit outcome per candidate", async () => {
    await expect(
      collectCatalogEvidence({
        runId: "run-5",
        candidates: [candidate],
        adapter: adapter(),
        apply: true,
      }),
    ).rejects.toThrow("requires an evidence attempt writer");
    const writer = { saveAttempt: vi.fn().mockResolvedValue(undefined) };
    await collectCatalogEvidence({
      runId: "run-5",
      candidates: [candidate],
      adapter: adapter(),
      apply: true,
      writer,
    });
    expect(writer.saveAttempt).toHaveBeenCalledOnce();
    expect(writer.saveAttempt).toHaveBeenCalledWith(
      "run-5",
      expect.objectContaining({ outcome: "EVIDENCE_FOUND" }),
    );
  });
});
