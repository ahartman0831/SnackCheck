import type { ComplianceResult, VerificationStatus } from "@snackcheck/contracts";

export interface ProductRecord {
  id: string;
  slug: string;
  brand: string;
  name: string;
  variant: string | null;
  size: string | null;
  category: string | null;
  gtin14: string | null;
  primaryUpc: string | null;
  imageUrl: string | null;
  imageAttribution: string | null;
  individuallyPackaged: boolean | null;
  formulationConflict: boolean;
  labeledDevelopmentFixture: boolean;
}

export interface FormulationRecord {
  id: string;
  productId: string;
  version: number;
  rawIngredients: string;
  normalizedIngredientText: string;
  hash: string;
  verificationStatus: VerificationStatus;
  confidence: number | null;
  lastVerifiedAt: string | null;
  firstObservedAt: string;
  conflict: boolean;
  sourceType: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

export interface ProductPageModel {
  product: ProductRecord;
  formulation: FormulationRecord | null;
  classroom: ComplianceResult;
  ownChild: ComplianceResult;
}
