import { normalizeIngredientText, parseIngredients } from "@snackcheck/compliance";
import { z } from "zod";
import type { Database } from "@snackcheck/db-types";
import { normalizeGtin } from "../gtin";
import { newestEvidenceByUrl } from "./evidence-dossier";

type Row = Database["public"]["Tables"]["catalog_evidence_attempts"]["Row"];
export type ReviewEvidenceRow = Pick<
  Row,
  | "id"
  | "candidate_id"
  | "source_url"
  | "source_kind"
  | "outcome"
  | "reason_code"
  | "evidence_title"
  | "ingredient_text"
  | "evidence_text"
  | "observed_at"
  | "retrieved_at"
  | "created_at"
  | "license_identifier"
  | "attribution"
>;
export const REVIEW_EVIDENCE_COLUMNS =
  "id,candidate_id,source_url,source_kind,outcome,reason_code,evidence_title,ingredient_text,evidence_text,observed_at,retrieved_at,created_at,license_identifier,attribution";
export type EvidenceComparison =
  | "INGREDIENTS_MISSING"
  | "IDENTITY_CONFLICT"
  | "TEXT_NEEDS_REVIEW"
  | "TEXT_MATCH"
  | "TEXT_DIFFERS";
export type ReviewNextStep =
  | "COLLECT_INGREDIENT_EVIDENCE"
  | "RESOLVE_IDENTITY"
  | "REPAIR_SOURCE_TEXT"
  | "COMPARE_INGREDIENTS"
  | "VERIFY_IDENTITY_AND_DATE";
const OffSnapshot = z.object({
  code: z.string().nullable().optional(),
  productName: z.string().max(1000).nullable().optional(),
  brands: z.string().max(1000).nullable().optional(),
  quantity: z.string().max(1000).nullable().optional(),
  ingredientText: z.string().max(10000).nullable().optional(),
});
export function safeEvidenceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
function offSnapshot(row: ReviewEvidenceRow) {
  const url = safeEvidenceUrl(row.source_url);
  if (!url || row.source_kind !== "SECONDARY") return null;
  const host = new URL(url).hostname;
  if (host !== "openfoodfacts.org" && !host.endsWith(".openfoodfacts.org")) return null;
  try {
    const parsed = OffSnapshot.safeParse(JSON.parse(row.evidence_text ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Read-only evidence comparison. It never approves a product or treats a record edit as a label date. */
export function buildCatalogReviewPacket(
  candidate: { id: string; gtin14: string; rawIngredientText: string },
  rows: ReviewEvidenceRow[],
) {
  // Defense in depth: callers must query by candidate; never compare another candidate's evidence.
  const candidateWarnings = parseIngredients(candidate.rawIngredientText).warnings;
  const owned = rows.filter((row) => row.candidate_id === candidate.id);
  const newest = newestEvidenceByUrl(owned);
  const sources = [...newest.values()]
    .sort(
      (a, b) =>
        Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id),
    )
    .map((row) => {
      const snapshot = row.outcome === "EVIDENCE_FOUND" ? offSnapshot(row) : null;
      const gtin = snapshot?.code ? normalizeGtin(snapshot.code) : null;
      const identity =
        gtin && !("error" in gtin)
          ? gtin.gtin14 === candidate.gtin14
            ? "BARCODE_MATCH"
            : "BARCODE_MISMATCH"
          : "IDENTITY_NOT_ESTABLISHED";
      const ingredients =
        row.outcome !== "EVIDENCE_FOUND"
          ? null
          : row.source_kind === "MANUFACTURER"
            ? row.ingredient_text?.trim() || null
            : snapshot?.ingredientText?.trim() || null;
      const warnings = ingredients ? parseIngredients(ingredients).warnings : [];
      const comparison: EvidenceComparison =
        identity === "BARCODE_MISMATCH"
          ? "IDENTITY_CONFLICT"
          : !ingredients
            ? "INGREDIENTS_MISSING"
            : warnings.length
              ? "TEXT_NEEDS_REVIEW"
              : normalizeIngredientText(ingredients) ===
                  normalizeIngredientText(candidate.rawIngredientText)
                ? "TEXT_MATCH"
                : "TEXT_DIFFERS";
      return {
        id: row.id,
        sourceKind: row.source_kind,
        sourceUrl: safeEvidenceUrl(row.source_url),
        title: row.evidence_title ?? "Collected source",
        outcome: row.outcome,
        reason: row.reason_code,
        productName: snapshot?.productName ?? null,
        brand: snapshot?.brands ?? null,
        quantity: snapshot?.quantity ?? null,
        barcode: snapshot?.code ?? null,
        identity,
        ingredientText: ingredients,
        comparison,
        parserWarnings: warnings,
        recordUpdatedAt: row.observed_at,
        retrievedAt: row.retrieved_at,
        licenseIdentifier: row.license_identifier,
        attribution: row.attribution,
      };
    });
  const attemptsWithoutSource = owned
    .filter((row) => !row.source_url)
    .map((row) => ({
      id: row.id,
      outcome: row.outcome,
      reason: row.reason_code,
      createdAt: row.created_at,
    }));
  const usableSources = sources.filter((source) => source.ingredientText);
  const nextStep: ReviewNextStep = sources.some(
    (source) => source.comparison === "IDENTITY_CONFLICT",
  )
    ? "RESOLVE_IDENTITY"
    : usableSources.length === 0
      ? "COLLECT_INGREDIENT_EVIDENCE"
      : candidateWarnings.length > 0 ||
          sources.some((source) => source.comparison === "TEXT_NEEDS_REVIEW")
        ? "REPAIR_SOURCE_TEXT"
        : sources.some((source) => source.comparison === "TEXT_DIFFERS")
          ? "COMPARE_INGREDIENTS"
          : "VERIFY_IDENTITY_AND_DATE";
  return {
    candidateId: candidate.id,
    reviewOnly: true as const,
    nextStep,
    candidateParserWarnings: candidateWarnings,
    manufacturerIngredientsAvailable: usableSources.some(
      (source) => source.sourceKind === "MANUFACTURER",
    ),
    sources,
    attemptsWithoutSource,
  };
}
export type CatalogReviewPacket = ReturnType<typeof buildCatalogReviewPacket>;
