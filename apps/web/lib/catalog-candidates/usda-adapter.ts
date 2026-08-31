import { createHash } from "node:crypto";
import { ENGINE_VERSION, matchRules, parseIngredients } from "@snackcheck/compliance";
import {
  CatalogSourceRecordSchema,
  type CatalogImportErrorCategory,
  type CatalogSourceRecord,
  type PublishedRulesetSnapshot,
  type QualityFlag,
} from "@snackcheck/contracts";
import { normalizeGtin } from "../gtin";

export const USDA_ADAPTER_VERSION = "usda-branded-csv-v1";
export const USDA_LICENSE = "CC0-1.0";

export type CsvChunk = string | Uint8Array;

export interface CandidateAccepted {
  kind: "accepted";
  line: number;
  record: CatalogSourceRecord;
}

export interface CandidateRejected {
  kind: "rejected";
  line: number;
  category: CatalogImportErrorCategory;
}

export type CandidateAdapterResult = CandidateAccepted | CandidateRejected;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableRecordHash(values: Record<string, string>): string {
  return sha256(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(values).sort(([left], [right]) => left.localeCompare(right)),
      ),
    ),
  );
}

function isoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed,
  );
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

async function* csvRows(chunks: AsyncIterable<CsvChunk>): AsyncGenerator<string[]> {
  const decoder = new TextDecoder();
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let quotePending = false;

  const consume = function* (text: string): Generator<string[]> {
    for (const char of text) {
      if (quoted) {
        if (quotePending) {
          if (char === '"') {
            field += '"';
            quotePending = false;
            continue;
          }
          quoted = false;
          quotePending = false;
        } else if (char === '"') {
          quotePending = true;
          continue;
        } else {
          field += char;
          continue;
        }
      }

      if (char === '"' && field.length === 0) {
        quoted = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field.replace(/\r$/, ""));
        field = "";
        if (row.some((cell) => cell.length > 0)) yield row;
        row = [];
      } else if (char !== "\r") {
        field += char;
      }
    }
  };

  for await (const chunk of chunks) {
    const text =
      typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    yield* consume(text);
  }
  yield* consume(decoder.decode());
  if (quotePending) {
    quoted = false;
    quotePending = false;
  }
  if (quoted) throw new Error("USDA CSV ended inside a quoted field");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) yield row;
  }
}

function screenIngredients(
  rawIngredientText: string,
  ruleset: PublishedRulesetSnapshot,
): Pick<
  CatalogSourceRecord,
  | "normalizedIngredientText"
  | "ingredientTextSha256"
  | "screenStatus"
  | "qualityFlags"
  | "matchedRuleIds"
> {
  const parsed = parseIngredients(rawIngredientText);
  const matches = matchRules(parsed.ingredients, ruleset.substances);
  const declared = matches.filter((match) => !match.precautionary);
  const precautionary = matches.filter((match) => match.precautionary);
  const qualityFlags: QualityFlag[] =
    parsed.warnings.length > 0 ? ["PARSER_WARNING"] : [];
  const screenStatus =
    declared.length > 0
      ? "FAIL"
      : precautionary.length > 0 || qualityFlags.length > 0
        ? "VERIFY"
        : "PASS";

  return {
    normalizedIngredientText: parsed.normalizedText,
    ingredientTextSha256: sha256(rawIngredientText.trim()),
    screenStatus,
    qualityFlags,
    matchedRuleIds: [...new Set(matches.map((match) => match.substanceId))],
  };
}

function field(record: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    const value = record[name]?.trim();
    if (value) return value;
  }
  return "";
}

function mapUsdaRow(
  values: Record<string, string>,
  line: number,
  ruleset: PublishedRulesetSnapshot,
): CandidateAdapterResult {
  const externalRecordId = field(values, "fdc_id");
  const sourceGtin = field(values, "gtin_upc");
  const brand = field(values, "brand_name", "brand_owner");
  const productName = field(values, "description", "food_description");
  if (!externalRecordId || !sourceGtin || !brand || !productName) {
    return { kind: "rejected", line, category: "INVALID_ROW" };
  }

  const gtin = normalizeGtin(sourceGtin);
  if ("error" in gtin) return { kind: "rejected", line, category: "INVALID_GTIN" };

  const ingredients = field(values, "ingredients");
  if (!ingredients) return { kind: "rejected", line, category: "MISSING_INGREDIENTS" };

  const marketCountry = field(values, "market_country");
  if (!/^(united states|us|usa|u\.s\.)$/i.test(marketCountry)) {
    return { kind: "rejected", line, category: "NON_US_MARKET" };
  }

  const discontinued = Boolean(field(values, "discontinued_date"));
  if (discontinued) return { kind: "rejected", line, category: "DISCONTINUED" };

  const sourceModifiedAt = isoDate(field(values, "modified_date"));
  const sourcePublishedAt = isoDate(field(values, "publication_date", "available_date"));
  const sourceVersion =
    field(values, "modified_date", "publication_date", "available_date") || "undated";
  const screened = screenIngredients(ingredients, ruleset);
  const sourceHashValues = {
    externalRecordId,
    sourceVersion,
    sourceGtin,
    brand,
    productName,
    ingredients,
    marketCountry,
  };

  const parsed = CatalogSourceRecordSchema.safeParse({
    provider: "USDA_FDC",
    externalRecordId,
    sourceVersion,
    sourceRecordSha256: stableRecordHash(sourceHashValues),
    sourceGtin,
    normalizedGtin14: gtin.gtin14,
    brand,
    productName,
    variant: field(values, "subbrand_name") || null,
    size:
      field(values, "package_weight") ||
      [field(values, "serving_size"), field(values, "serving_size_unit")]
        .filter(Boolean)
        .join(" ") ||
      null,
    category: field(values, "branded_food_category") || null,
    rawIngredientText: ingredients,
    ...screened,
    marketCountry,
    sourceModifiedAt,
    sourcePublishedAt,
    discontinued: false,
    sourceUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${encodeURIComponent(externalRecordId)}`,
    sourceReference: `USDA FoodData Central FDC ${externalRecordId}`,
    licenseIdentifier: USDA_LICENSE,
    attribution: "USDA FoodData Central",
    engineVersion: ENGINE_VERSION,
    rulesetHash: ruleset.rulesetHash,
  });
  if (!parsed.success) return { kind: "rejected", line, category: "INVALID_ROW" };
  return { kind: "accepted", line, record: parsed.data };
}

export async function* streamUsdaBrandedCandidates(
  chunks: AsyncIterable<CsvChunk>,
  ruleset: PublishedRulesetSnapshot,
): AsyncGenerator<CandidateAdapterResult> {
  let headers: string[] | null = null;
  let line = 0;
  for await (const cells of csvRows(chunks)) {
    line += 1;
    if (headers === null) {
      headers = cells.map((cell) => cell.trim().replace(/^\ufeff/, ""));
      continue;
    }
    const values = Object.fromEntries(
      headers.map((header, index) => [header, cells[index] ?? ""]),
    );
    yield mapUsdaRow(values, line, ruleset);
  }
  if (headers === null) throw new Error("USDA CSV is empty");
}
