import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  DiscoveredEvidenceReference,
  EvidenceCandidate,
  EvidenceCollectionAdapter,
  RetrievedEvidence,
} from "./collector";
import { readBoundedResponseBytes } from "./bounded-response";

const OffResponseSchema = z.object({
  status: z.union([z.number(), z.string()]).optional(),
  product: z
    .object({
      code: z.string().optional(),
      product_name: z.string().optional(),
      brands: z.string().optional(),
      quantity: z.string().optional(),
      ingredients_text: z.string().optional(),
      ingredients_text_en: z.string().optional(),
      last_modified_t: z.union([z.number(), z.string()]).optional(),
    })
    .optional(),
});

type FetchLike = typeof fetch;

export type OpenFoodFactsEvidenceAdapterOptions = {
  userAgent: string;
  baseUrl?: string;
  fetcher?: FetchLike;
  minimumIntervalMs?: number;
  now?: () => number;
  wait?: (milliseconds: number) => Promise<void>;
};

function gtinForLookup(gtin14: string): string {
  return gtin14.replace(/^0+/, "") || gtin14;
}

function observedAt(value: number | string | undefined): string | null {
  if (value === undefined) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export class OpenFoodFactsEvidenceAdapter implements EvidenceCollectionAdapter {
  private readonly userAgent: string;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;
  private readonly minimumIntervalMs: number;
  private readonly now: () => number;
  private readonly wait: (milliseconds: number) => Promise<void>;
  private nextRequestAt = 0;

  constructor(options: OpenFoodFactsEvidenceAdapterOptions) {
    if (!/^\S+\/\S+ \([^()\s]+@[^()\s]+\)$/.test(options.userAgent.trim())) {
      throw new Error(
        "Open Food Facts requires an identifying App/Version (Contact) User-Agent.",
      );
    }
    const baseUrl = new URL(options.baseUrl ?? "https://world.openfoodfacts.org");
    if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password) {
      throw new Error("Open Food Facts base URL must be credential-free HTTPS.");
    }
    this.userAgent = options.userAgent.trim();
    this.baseUrl = baseUrl.origin;
    this.fetcher = options.fetcher ?? fetch;
    this.minimumIntervalMs = options.minimumIntervalMs ?? 4_100;
    if (this.minimumIntervalMs < 4_000 || this.minimumIntervalMs > 60_000) {
      throw new Error(
        "Open Food Facts requests must remain below the documented read rate limit.",
      );
    }
    this.now = options.now ?? Date.now;
    this.wait =
      options.wait ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async discover(
    candidate: EvidenceCandidate,
    options: { maxResults: number; signal: AbortSignal },
  ): Promise<{ requestCount: number; references: DiscoveredEvidenceReference[] }> {
    void options;
    const code = gtinForLookup(candidate.normalizedGtin14);
    const fields = [
      "code",
      "product_name",
      "brands",
      "quantity",
      "ingredients_text",
      "ingredients_text_en",
      "last_modified_t",
    ].join(",");
    return {
      requestCount: 0,
      references: [
        {
          url: `${this.baseUrl}/api/v3/product/${encodeURIComponent(code)}?fields=${fields}`,
          title: `Open Food Facts record for ${candidate.brand} ${candidate.productName}`,
        },
      ],
    };
  }

  async retrieve(
    reference: DiscoveredEvidenceReference,
    options: { maxBytes: number; signal: AbortSignal },
  ): Promise<{ requestCount: number; evidence: RetrievedEvidence | null }> {
    const delay = Math.max(0, this.nextRequestAt - this.now());
    if (delay) await this.wait(delay);
    this.nextRequestAt = this.now() + this.minimumIntervalMs;
    const response = await this.fetcher(reference.url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": this.userAgent },
      redirect: "follow",
      signal: options.signal,
    });
    if (response.status === 404) return { requestCount: 1, evidence: null };
    if (!response.ok)
      throw new Error(`Open Food Facts returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (contentType !== "application/json")
      throw new Error("Open Food Facts returned an unexpected content type.");
    let bytes: Uint8Array;
    try {
      bytes = await readBoundedResponseBytes(response, options.maxBytes);
    } catch (error) {
      if (error instanceof Error && error.message.includes("byte limit")) {
        throw new Error("Open Food Facts response exceeded the byte limit.");
      }
      throw error;
    }
    const parsed = OffResponseSchema.safeParse(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
    if (
      !parsed.success ||
      parsed.data.status === 0 ||
      parsed.data.status === "failure" ||
      !parsed.data.product?.product_name ||
      !parsed.data.product.code
    ) {
      return { requestCount: 1, evidence: null };
    }
    const product = parsed.data.product;
    const productCode = product.code;
    if (!productCode) return { requestCount: 1, evidence: null };
    const requestedCode = decodeURIComponent(
      new URL(reference.url).pathname.split("/").pop() ?? "",
    );
    if (gtinForLookup(productCode) !== gtinForLookup(requestedCode)) {
      throw new Error("Open Food Facts returned a different barcode than requested.");
    }
    const ingredientText =
      product.ingredients_text_en ?? product.ingredients_text ?? null;
    const evidenceText = JSON.stringify({
      code: product.code ?? null,
      productName: product.product_name,
      brands: product.brands ?? null,
      quantity: product.quantity ?? null,
      ingredientText,
    });
    return {
      requestCount: 1,
      evidence: {
        url: response.url || reference.url,
        title: `Open Food Facts: ${product.product_name}`,
        retrievedAt: new Date(this.now()).toISOString(),
        observedAt: observedAt(product.last_modified_t),
        contentSha256: createHash("sha256").update(bytes).digest("hex"),
        byteSize: bytes.byteLength,
        mediaType: contentType,
        licenseIdentifier: "ODbL-1.0; DbCL-1.0",
        attribution: "Open Food Facts contributors",
        ingredientText,
        evidenceText,
      },
    };
  }
}
