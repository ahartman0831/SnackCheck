export const EVIDENCE_SOURCE_POLICY_VERSION = "evidence-source-v1";

export type EvidenceSourceKind = "MANUFACTURER" | "SECONDARY";

export type EvidenceSourceDecision =
  | {
      accepted: true;
      kind: EvidenceSourceKind;
      normalizedUrl: string;
      hostname: string;
    }
  | {
      accepted: false;
      reason:
        | "INVALID_URL"
        | "INSECURE_URL"
        | "CREDENTIALS_IN_URL"
        | "NON_STANDARD_PORT"
        | "SEARCH_OR_SOCIAL_HOST"
        | "RETAILER_HOST"
        | "HOST_NOT_ALLOWED";
    };

const SEARCH_OR_SOCIAL_HOSTS = [
  "bing.com",
  "duckduckgo.com",
  "facebook.com",
  "google.com",
  "instagram.com",
  "pinterest.com",
  "tiktok.com",
  "x.com",
  "yahoo.com",
  "youtube.com",
] as const;

const RETAILER_HOSTS = [
  "amazon.com",
  "costco.com",
  "instacart.com",
  "kroger.com",
  "samsclub.com",
  "target.com",
  "walmart.com",
] as const;

const SECONDARY_HOSTS = [
  "fdc.nal.usda.gov",
  "openfoodfacts.org",
  "world.openfoodfacts.org",
] as const;

function canonicalHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

function hostMatches(hostname: string, allowed: string): boolean {
  return hostname === allowed || hostname.endsWith(`.${allowed}`);
}

function matchesAny(hostname: string, hosts: readonly string[]): boolean {
  return hosts.some((host) => hostMatches(hostname, host));
}

export function assessEvidenceSource(
  rawUrl: string,
  manufacturerHosts: readonly string[],
): EvidenceSourceDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { accepted: false, reason: "INVALID_URL" };
  }
  if (url.protocol !== "https:") {
    return { accepted: false, reason: "INSECURE_URL" };
  }
  if (url.username || url.password) {
    return { accepted: false, reason: "CREDENTIALS_IN_URL" };
  }
  if (url.port && url.port !== "443") {
    return { accepted: false, reason: "NON_STANDARD_PORT" };
  }

  const hostname = canonicalHost(url.hostname);
  if (matchesAny(hostname, SEARCH_OR_SOCIAL_HOSTS)) {
    return { accepted: false, reason: "SEARCH_OR_SOCIAL_HOST" };
  }
  if (matchesAny(hostname, RETAILER_HOSTS)) {
    return { accepted: false, reason: "RETAILER_HOST" };
  }

  const normalizedManufacturerHosts = manufacturerHosts
    .map(canonicalHost)
    .filter(Boolean);
  const kind = normalizedManufacturerHosts.some((host) => hostMatches(hostname, host))
    ? "MANUFACTURER"
    : matchesAny(hostname, SECONDARY_HOSTS)
      ? "SECONDARY"
      : null;
  if (!kind) return { accepted: false, reason: "HOST_NOT_ALLOWED" };

  url.hostname = hostname;
  url.hash = "";
  return { accepted: true, kind, normalizedUrl: url.toString(), hostname };
}
