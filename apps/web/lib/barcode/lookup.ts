import { normalizeGtin } from "@/lib/gtin";

export type BarcodeLookupResult =
  | { status: "found"; slug: string; gtin14: string }
  | { status: "unknown"; gtin14: string }
  | { status: "invalid"; message: string }
  | { status: "rate_limited"; message: string }
  | { status: "offline"; message: string }
  | { status: "unavailable"; message: string };

export function routeForLookup(result: BarcodeLookupResult): string | null {
  if (result.status === "found") {
    return `/product/${result.slug}`;
  }
  if (result.status === "unknown") {
    return `/scan/ingredients?gtin=${encodeURIComponent(result.gtin14)}`;
  }
  return null;
}

export async function lookupNormalizedGtin(
  rawInput: string,
  options?: { fetchImpl?: typeof fetch; online?: boolean },
): Promise<BarcodeLookupResult> {
  const normalized = normalizeGtin(rawInput.replace(/\s/g, ""));
  if ("error" in normalized) {
    return { status: "invalid", message: normalized.error };
  }

  const online =
    options?.online ?? (typeof navigator === "undefined" ? true : navigator.onLine);
  if (online === false) {
    return {
      status: "offline",
      message: "You are offline. Reconnect to look up a barcode.",
    };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(
      `/api/v1/upc/${encodeURIComponent(normalized.gtin14)}`,
    );
    const payload = (await response.json().catch(() => null)) as {
      data?: { lookup?: { result?: { slug?: string } } };
      error?: { code?: string; message?: string };
    } | null;

    if (response.status === 429) {
      return {
        status: "rate_limited",
        message: payload?.error?.message ?? "Too many lookups.",
      };
    }
    if (!response.ok) {
      return {
        status: "unavailable",
        message: payload?.error?.message ?? "That barcode could not be checked.",
      };
    }

    const slug = payload?.data?.lookup?.result?.slug;
    if (slug) {
      return { status: "found", slug, gtin14: normalized.gtin14 };
    }
    return { status: "unknown", gtin14: normalized.gtin14 };
  } catch {
    return {
      status: "unavailable",
      message: "Lookup is unavailable. Your numbers were kept.",
    };
  }
}
