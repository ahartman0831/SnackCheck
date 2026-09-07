import { createHash } from "node:crypto";
import type {
  DiscoveredEvidenceReference,
  EvidenceCandidate,
  EvidenceCollectionAdapter,
  RetrievedEvidence,
} from "./collector";
import { EvidenceCollectionPolicyError } from "./collector";
import { readBoundedResponseBytes } from "./bounded-response";
import {
  extractManufacturerPageSnapshot,
  type ManufacturerPageSnapshot,
} from "./manufacturer-page";
import type { ManufacturerManifestEntry } from "./manufacturer-manifest";
import { assessEvidenceSource } from "./source-policy";

type FetchLike = typeof fetch;

export class ManufacturerEvidenceAdapter implements EvidenceCollectionAdapter {
  private readonly entries: Map<string, ManufacturerManifestEntry>;
  private readonly entriesByUrl: Map<string, ManufacturerManifestEntry>;

  constructor(
    entries: ManufacturerManifestEntry[],
    private readonly options: {
      userAgent: string;
      fetcher?: FetchLike;
      now?: () => number;
    },
  ) {
    if (!/^\S+\/\S+ \([^()]+\)$/.test(options.userAgent.trim())) {
      throw new Error("Manufacturer collection requires an identifying User-Agent.");
    }
    this.entries = new Map(entries.map((entry) => [entry.candidateId, entry]));
    this.entriesByUrl = new Map(
      entries.map((entry) => {
        const decision = assessEvidenceSource(entry.sourceUrl, [entry.manufacturerHost]);
        if (!decision.accepted) {
          throw new Error("Manufacturer manifest source failed the evidence policy.");
        }
        return [decision.normalizedUrl, entry];
      }),
    );
  }

  async discover(
    candidate: EvidenceCandidate,
    options: { maxResults: number; signal: AbortSignal },
  ): Promise<{ requestCount: number; references: DiscoveredEvidenceReference[] }> {
    void options;
    const entry = this.entries.get(candidate.id);
    if (!entry) return { requestCount: 0, references: [] };
    if (entry.normalizedGtin14 !== candidate.normalizedGtin14) {
      throw new Error("Manufacturer manifest barcode does not match the candidate.");
    }
    return {
      requestCount: 0,
      references: [{ url: entry.sourceUrl, title: candidate.productName }],
    };
  }

  async retrieve(
    reference: DiscoveredEvidenceReference,
    options: { maxBytes: number; signal: AbortSignal },
  ): Promise<{ requestCount: number; evidence: RetrievedEvidence | null }> {
    const entry = this.entriesByUrl.get(reference.url);
    if (!entry) throw new EvidenceCollectionPolicyError("MANIFEST_REFERENCE_MISSING");
    const response = await (this.options.fetcher ?? fetch)(reference.url, {
      method: "GET",
      headers: {
        Accept: "text/html, application/json;q=0.9",
        "User-Agent": this.options.userAgent.trim(),
      },
      redirect: "follow",
      signal: options.signal,
    });
    if (response.status === 404 || response.status === 410) {
      return { requestCount: 1, evidence: null };
    }
    if (!response.ok) throw new Error(`Manufacturer returned HTTP ${response.status}.`);
    const mediaType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (mediaType !== "text/html" && mediaType !== "application/json") {
      throw new Error("Manufacturer returned an unsupported content type.");
    }
    const bytes = await readBoundedResponseBytes(response, options.maxBytes);
    const snapshot: ManufacturerPageSnapshot = extractManufacturerPageSnapshot(
      new TextDecoder().decode(bytes),
      mediaType,
    );
    if (!snapshot.productName && !snapshot.ingredientText && !snapshot.gtins.length) {
      return { requestCount: 1, evidence: null };
    }
    if (
      snapshot.gtins.length > 0 &&
      !snapshot.gtins.some((gtin) => gtin.padStart(14, "0") === entry.normalizedGtin14)
    ) {
      throw new EvidenceCollectionPolicyError("MANUFACTURER_GTIN_MISMATCH");
    }
    const evidenceText = JSON.stringify(snapshot);
    const finalUrl = response.url || reference.url;
    return {
      requestCount: 1,
      evidence: {
        url: finalUrl,
        title: `Manufacturer: ${snapshot.productName ?? reference.title}`,
        retrievedAt: new Date((this.options.now ?? Date.now)()).toISOString(),
        observedAt: null,
        contentSha256: createHash("sha256").update(bytes).digest("hex"),
        byteSize: bytes.byteLength,
        mediaType,
        licenseIdentifier: null,
        attribution: `Official manufacturer page at ${new URL(finalUrl).hostname}`,
        ingredientText: snapshot.ingredientText,
        evidenceText,
      },
    };
  }
}
