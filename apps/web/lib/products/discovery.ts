import type { PublicProductCard } from "@snackcheck/contracts";

export type DiscoveryFilters = {
  category?: string;
  brand?: string;
  verification?: "VERIFIED" | "PACKAGE_VERIFIED";
  individuallyPackaged?: boolean;
};

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length <= 80 ? normalized : undefined;
}

export function parseDiscoveryFilters(input: {
  category?: string;
  brand?: string;
  verification?: string;
  packaged?: string;
}): DiscoveryFilters {
  const verification =
    input.verification === "VERIFIED" || input.verification === "PACKAGE_VERIFIED"
      ? input.verification
      : undefined;
  return {
    category: clean(input.category),
    brand: clean(input.brand),
    verification,
    individuallyPackaged: input.packaged === "yes" ? true : undefined,
  };
}

export function filterDiscoveryProducts(
  products: PublicProductCard[],
  filters: DiscoveryFilters,
): PublicProductCard[] {
  return products.filter((product) => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.brand && product.brand !== filters.brand) return false;
    if (filters.verification && product.verificationStatus !== filters.verification) {
      return false;
    }
    if (filters.individuallyPackaged === true && product.individuallyPackaged !== true) {
      return false;
    }
    return true;
  });
}

export function categoryLabel(category: string): string {
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatEvidenceDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function discoveryHref(filters: {
  category?: string;
  brand?: string;
  verification?: string;
  packaged?: string;
  offset?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.verification) params.set("verification", filters.verification);
  if (filters.packaged) params.set("packaged", filters.packaged);
  if (filters.offset && filters.offset > 0) params.set("offset", String(filters.offset));
  const query = params.toString();
  return query ? `/approved?${query}` : "/approved";
}
