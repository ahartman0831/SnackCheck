export interface ProviderProvenance {
  provider: string;
  fetchedAt: string;
  attribution?: string;
}

export interface ExternalProductCandidate {
  gtin14: string;
  brand: string;
  name: string;
  ingredients: string | null;
  imageUrl: string | null;
  imageAttribution: string | null;
}

export type ProviderProductResult =
  | { kind: "FOUND"; product: ExternalProductCandidate; provenance: ProviderProvenance }
  | { kind: "NOT_FOUND"; provenance: ProviderProvenance }
  | { kind: "UNAVAILABLE"; retryAfter?: number; provenance: ProviderProvenance };

export interface ProductDataProvider {
  readonly name: string;
  getByGtin(gtin14: string): Promise<ProviderProductResult>;
}
