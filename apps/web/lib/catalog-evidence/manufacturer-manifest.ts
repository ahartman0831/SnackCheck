import { z } from "zod";

const HOST_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const ManufacturerManifestEntrySchema = z.object({
  candidateId: z.string().uuid(),
  normalizedGtin14: z.string().regex(/^\d{14}$/),
  sourceUrl: z.string().url(),
  manufacturerHost: z.string().trim().toLowerCase().regex(HOST_PATTERN),
  termsStatus: z.literal("ALLOWED"),
  termsReviewedAt: z.string().datetime({ offset: true }),
  termsReferenceUrl: z.string().url(),
});

export type ManufacturerManifestEntry = z.infer<typeof ManufacturerManifestEntrySchema>;

function canonicalHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

function belongsToHost(hostname: string, allowedHost: string): boolean {
  const host = canonicalHost(hostname);
  const allowed = canonicalHost(allowedHost);
  return host === allowed || host.endsWith(`.${allowed}`);
}

function safeHttpsUrl(value: string, field: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error(`${field} must be credential-free HTTPS on the standard port.`);
  }
  return url;
}

export function parseManufacturerManifest(
  value: unknown,
  options: { now?: Date; maxEntries?: number; maxReviewAgeDays?: number } = {},
): ManufacturerManifestEntry[] {
  const maxEntries = options.maxEntries ?? 15;
  const parsed = z.array(ManufacturerManifestEntrySchema).max(maxEntries).parse(value);
  const now = options.now ?? new Date();
  const maxReviewAgeMs = (options.maxReviewAgeDays ?? 365) * 86_400_000;
  const candidateIds = new Set<string>();
  const sourceUrls = new Set<string>();

  return parsed.map((entry) => {
    const sourceUrl = safeHttpsUrl(entry.sourceUrl, "sourceUrl");
    const termsUrl = safeHttpsUrl(entry.termsReferenceUrl, "termsReferenceUrl");
    if (!belongsToHost(sourceUrl.hostname, entry.manufacturerHost)) {
      throw new Error("Manufacturer source URL does not match its reviewed host.");
    }
    if (!belongsToHost(termsUrl.hostname, entry.manufacturerHost)) {
      throw new Error("Terms reference URL does not match its reviewed host.");
    }
    const reviewedAt = Date.parse(entry.termsReviewedAt);
    if (reviewedAt > now.getTime() || now.getTime() - reviewedAt > maxReviewAgeMs) {
      throw new Error("Manufacturer terms review is missing, future-dated, or stale.");
    }
    const normalizedSourceUrl = sourceUrl.toString();
    if (candidateIds.has(entry.candidateId) || sourceUrls.has(normalizedSourceUrl)) {
      throw new Error("Manufacturer manifest entries must be unique.");
    }
    candidateIds.add(entry.candidateId);
    sourceUrls.add(normalizedSourceUrl);
    return { ...entry, sourceUrl: normalizedSourceUrl };
  });
}
