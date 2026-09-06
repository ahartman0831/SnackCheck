import { assessEvidenceSource, type EvidenceSourceKind } from "./source-policy";

export const EVIDENCE_COLLECTOR_VERSION = "catalog-evidence-v1";

export type EvidenceCandidate = {
  id: string;
  provider: "USDA_FDC" | "OPEN_FOOD_FACTS";
  brand: string;
  productName: string;
  variant: string | null;
  size: string | null;
  normalizedGtin14: string;
  manufacturerHosts: string[];
};

export type DiscoveredEvidenceReference = {
  url: string;
  title: string;
};

export type RetrievedEvidence = {
  url: string;
  title: string;
  retrievedAt: string;
  observedAt: string | null;
  contentSha256: string;
  byteSize: number;
  mediaType: string;
  licenseIdentifier: string | null;
  attribution: string | null;
  ingredientText: string | null;
  evidenceText: string;
};

export interface EvidenceCollectionAdapter {
  discover(
    candidate: EvidenceCandidate,
    options: { maxResults: number; signal: AbortSignal },
  ): Promise<{ requestCount: number; references: DiscoveredEvidenceReference[] }>;
  retrieve(
    reference: DiscoveredEvidenceReference,
    options: { maxBytes: number; signal: AbortSignal },
  ): Promise<{ requestCount: number; evidence: RetrievedEvidence | null }>;
}

export type EvidenceAttemptOutcome =
  | "EVIDENCE_FOUND"
  | "NOT_FOUND"
  | "BLOCKED_BY_POLICY"
  | "REQUEST_LIMIT_REACHED"
  | "TIMEOUT"
  | "ERROR";

export type EvidenceAttempt = {
  candidateId: string;
  outcome: EvidenceAttemptOutcome;
  reasonCode: string;
  requestCount: number;
  evidence:
    (RetrievedEvidence & { sourceKind: EvidenceSourceKind; hostname: string }) | null;
};

export interface EvidenceAttemptWriter {
  saveAttempt(runId: string, attempt: EvidenceAttempt): Promise<void>;
}

export type EvidenceCollectorLimits = {
  maxCandidates: number;
  maxRequestsPerCandidate: number;
  maxRequestsPerRun: number;
  maxReferencesPerCandidate: number;
  maxResponseBytes: number;
  timeoutMs: number;
};

export type EvidenceCollectionSummary = {
  collectorVersion: typeof EVIDENCE_COLLECTOR_VERSION;
  dryRun: boolean;
  candidatesAttempted: number;
  requestsMade: number;
  evidenceFound: number;
  notFound: number;
  blocked: number;
  failed: number;
  attempts: EvidenceAttempt[];
};

const DEFAULT_LIMITS: EvidenceCollectorLimits = {
  maxCandidates: 95,
  maxRequestsPerCandidate: 3,
  maxRequestsPerRun: 285,
  maxReferencesPerCandidate: 5,
  maxResponseBytes: 2_000_000,
  timeoutMs: 10_000,
};

const ALLOWED_MEDIA_TYPES = new Set([
  "application/json",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/html",
  "text/plain",
]);

function validEvidence(evidence: RetrievedEvidence): boolean {
  return (
    Number.isInteger(evidence.byteSize) &&
    evidence.byteSize >= 0 &&
    /^[0-9a-f]{64}$/.test(evidence.contentSha256) &&
    ALLOWED_MEDIA_TYPES.has(evidence.mediaType.toLowerCase().split(";")[0].trim()) &&
    evidence.title.trim().length > 0 &&
    evidence.title.length <= 500 &&
    evidence.evidenceText.length <= 50_000 &&
    (evidence.ingredientText === null || evidence.ingredientText.length <= 10_000) &&
    Number.isFinite(Date.parse(evidence.retrievedAt)) &&
    (evidence.observedAt === null || Number.isFinite(Date.parse(evidence.observedAt)))
  );
}

function validateLimits(limits: EvidenceCollectorLimits): void {
  if (
    !Number.isInteger(limits.maxCandidates) ||
    limits.maxCandidates < 1 ||
    limits.maxCandidates > 100
  )
    throw new Error("Evidence collection is limited to 1–100 candidates per run.");
  if (
    !Number.isInteger(limits.maxRequestsPerCandidate) ||
    limits.maxRequestsPerCandidate < 1 ||
    limits.maxRequestsPerCandidate > 5
  )
    throw new Error("Evidence collection is limited to 1–5 requests per candidate.");
  if (
    !Number.isInteger(limits.maxRequestsPerRun) ||
    limits.maxRequestsPerRun < 1 ||
    limits.maxRequestsPerRun > 500
  )
    throw new Error("Evidence collection is limited to 1–500 requests per run.");
  if (
    !Number.isInteger(limits.maxReferencesPerCandidate) ||
    limits.maxReferencesPerCandidate < 1 ||
    limits.maxReferencesPerCandidate > 10
  )
    throw new Error("Evidence discovery is limited to 1–10 references per candidate.");
  if (
    !Number.isInteger(limits.maxResponseBytes) ||
    limits.maxResponseBytes < 1 ||
    limits.maxResponseBytes > 5_000_000
  )
    throw new Error("Evidence responses are limited to 5 MB.");
  if (
    !Number.isInteger(limits.timeoutMs) ||
    limits.timeoutMs < 100 ||
    limits.timeoutMs > 30_000
  )
    throw new Error("Evidence requests require a timeout from 100–30,000 ms.");
}

async function withTimeout<T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function requestCount(value: number): number {
  if (!Number.isInteger(value) || value < 0)
    throw new Error("Adapter returned an invalid request count.");
  return value;
}

function failure(
  candidateId: string,
  outcome: EvidenceAttemptOutcome,
  reasonCode: string,
  requests: number,
): EvidenceAttempt {
  return { candidateId, outcome, reasonCode, requestCount: requests, evidence: null };
}

export async function collectCatalogEvidence(input: {
  runId: string;
  candidates: EvidenceCandidate[];
  adapter: EvidenceCollectionAdapter;
  apply?: boolean;
  writer?: EvidenceAttemptWriter;
  limits?: Partial<EvidenceCollectorLimits>;
}): Promise<EvidenceCollectionSummary> {
  const limits = { ...DEFAULT_LIMITS, ...input.limits };
  validateLimits(limits);
  if (input.candidates.length > limits.maxCandidates)
    throw new Error("Candidate count exceeds the run limit.");
  if (new Set(input.candidates.map(({ id }) => id)).size !== input.candidates.length)
    throw new Error("Evidence candidates must be unique.");
  if (input.apply && !input.writer)
    throw new Error("Apply mode requires an evidence attempt writer.");

  const attempts: EvidenceAttempt[] = [];
  let requestsMade = 0;
  for (const candidate of input.candidates) {
    if (requestsMade >= limits.maxRequestsPerRun) {
      attempts.push(
        failure(candidate.id, "REQUEST_LIMIT_REACHED", "RUN_REQUEST_LIMIT", 0),
      );
      continue;
    }

    let candidateRequests = 0;
    let attempt: EvidenceAttempt;
    try {
      const discovery = await withTimeout(limits.timeoutMs, (signal) =>
        input.adapter.discover(candidate, {
          maxResults: limits.maxReferencesPerCandidate,
          signal,
        }),
      );
      candidateRequests += requestCount(discovery.requestCount);
      requestsMade += discovery.requestCount;
      if (
        candidateRequests > limits.maxRequestsPerCandidate ||
        requestsMade > limits.maxRequestsPerRun
      ) {
        attempt = failure(
          candidate.id,
          "REQUEST_LIMIT_REACHED",
          "DISCOVERY_REQUEST_LIMIT",
          candidateRequests,
        );
      } else {
        const accepted = discovery.references
          .slice(0, limits.maxReferencesPerCandidate)
          .map((reference) => ({
            reference,
            decision: assessEvidenceSource(reference.url, candidate.manufacturerHosts),
          }))
          .find(({ decision }) => decision.accepted);
        if (!accepted) {
          attempt = failure(
            candidate.id,
            discovery.references.length ? "BLOCKED_BY_POLICY" : "NOT_FOUND",
            discovery.references.length ? "NO_ALLOWED_SOURCE" : "NO_DISCOVERY_RESULT",
            candidateRequests,
          );
        } else if (
          candidateRequests >= limits.maxRequestsPerCandidate ||
          requestsMade >= limits.maxRequestsPerRun
        ) {
          attempt = failure(
            candidate.id,
            "REQUEST_LIMIT_REACHED",
            "RETRIEVAL_REQUEST_LIMIT",
            candidateRequests,
          );
        } else {
          const acceptedDecision = accepted.decision;
          if (!acceptedDecision.accepted) {
            throw new Error("Accepted evidence reference failed its source policy.");
          }
          const retrieved = await withTimeout(limits.timeoutMs, (signal) =>
            input.adapter.retrieve(
              {
                ...accepted.reference,
                url: acceptedDecision.normalizedUrl,
              },
              { maxBytes: limits.maxResponseBytes, signal },
            ),
          );
          candidateRequests += requestCount(retrieved.requestCount);
          requestsMade += retrieved.requestCount;
          if (
            candidateRequests > limits.maxRequestsPerCandidate ||
            requestsMade > limits.maxRequestsPerRun
          ) {
            attempt = failure(
              candidate.id,
              "REQUEST_LIMIT_REACHED",
              "RETRIEVAL_REQUEST_LIMIT",
              candidateRequests,
            );
          } else if (!retrieved.evidence) {
            attempt = failure(
              candidate.id,
              "NOT_FOUND",
              "SOURCE_RECORD_NOT_FOUND",
              candidateRequests,
            );
          } else if (retrieved.evidence.byteSize > limits.maxResponseBytes) {
            attempt = failure(
              candidate.id,
              "BLOCKED_BY_POLICY",
              "RESPONSE_TOO_LARGE",
              candidateRequests,
            );
          } else {
            const finalSource = assessEvidenceSource(
              retrieved.evidence.url,
              candidate.manufacturerHosts,
            );
            if (!finalSource.accepted) {
              attempt = failure(
                candidate.id,
                "BLOCKED_BY_POLICY",
                "FINAL_URL_NOT_ALLOWED",
                candidateRequests,
              );
            } else if (!validEvidence(retrieved.evidence)) {
              attempt = failure(
                candidate.id,
                "BLOCKED_BY_POLICY",
                "INVALID_EVIDENCE_METADATA",
                candidateRequests,
              );
            } else {
              attempt = {
                candidateId: candidate.id,
                outcome: "EVIDENCE_FOUND",
                reasonCode: "ALLOWED_SOURCE_RETRIEVED",
                requestCount: candidateRequests,
                evidence: {
                  ...retrieved.evidence,
                  url: finalSource.normalizedUrl,
                  sourceKind: finalSource.kind,
                  hostname: finalSource.hostname,
                },
              };
            }
          }
        }
      }
    } catch (error) {
      attempt = failure(
        candidate.id,
        error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "ERROR",
        error instanceof Error && error.name === "AbortError"
          ? "REQUEST_TIMEOUT"
          : "ADAPTER_ERROR",
        candidateRequests,
      );
    }
    attempts.push(attempt);
    if (input.apply) await input.writer!.saveAttempt(input.runId, attempt);
  }

  return {
    collectorVersion: EVIDENCE_COLLECTOR_VERSION,
    dryRun: !input.apply,
    candidatesAttempted: attempts.length,
    requestsMade,
    evidenceFound: attempts.filter(({ outcome }) => outcome === "EVIDENCE_FOUND").length,
    notFound: attempts.filter(({ outcome }) => outcome === "NOT_FOUND").length,
    blocked: attempts.filter(
      ({ outcome }) =>
        outcome === "BLOCKED_BY_POLICY" || outcome === "REQUEST_LIMIT_REACHED",
    ).length,
    failed: attempts.filter(({ outcome }) => outcome === "ERROR" || outcome === "TIMEOUT")
      .length,
    attempts,
  };
}
