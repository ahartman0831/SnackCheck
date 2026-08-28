import { createHash } from "node:crypto";
import { parseIngredients } from "@snackcheck/compliance";
import { SourceTypeSchema, VerificationStatusSchema } from "@snackcheck/contracts";
import { normalizeGtin } from "../gtin";

export const IMPORT_COLUMNS = [
  "gtin14",
  "primary_upc",
  "brand",
  "name",
  "variant",
  "size",
  "category",
  "raw_ingredients",
  "source_type",
  "source_url",
  "source_title",
  "observed_at",
  "verification_status",
  "notes",
] as const;

export interface ImportRowInput {
  line: number;
  values: Record<(typeof IMPORT_COLUMNS)[number], string>;
}

export interface ValidatedImportRow {
  line: number;
  gtin14: string;
  primaryUpc: string | null;
  gtinFormat: string;
  brand: string;
  name: string;
  variant: string | null;
  size: string | null;
  category: string | null;
  slug: string;
  rawIngredients: string;
  ingredientTextSha256: string;
  sourceType: string;
  sourceUrl: string;
  sourceTitle: string | null;
  observedAt: string;
  verificationStatus: string;
  notes: string | null;
  idempotencyKey: string;
}

export interface ImportRowError {
  line: number;
  message: string;
}

export interface CatalogRecord {
  gtin14: string;
  ingredientTextSha256: string;
  sourceUrl: string;
}

export interface ImportPlan {
  accepted: ValidatedImportRow[];
  errors: ImportRowError[];
  duplicatesInFile: number;
  alreadyPresent: number;
}

export interface ImportAudit {
  dryRun: boolean;
  totalRows: number;
  accepted: number;
  created: number;
  unchanged: number;
  failed: number;
  errors: ImportRowError[];
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseImportCsv(csv: string): ImportRowInput[] {
  const lines = csv.split(/\r?\n/);
  const rows: ImportRowInput[] = [];
  let header: string[] | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    if (!raw.trim() || raw.trim().startsWith("#")) {
      continue;
    }
    const cells = splitCsvLine(raw);
    if (header === null) {
      header = cells.map((cell) => cell.trim());
      continue;
    }
    const columns = header;
    const values = Object.fromEntries(
      IMPORT_COLUMNS.map((column) => [
        column,
        cells[columns.indexOf(column)]?.trim() ?? "",
      ]),
    ) as ImportRowInput["values"];
    rows.push({ line: index + 1, values });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? "";
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

export function validateImportRow(
  row: ImportRowInput,
): ValidatedImportRow | ImportRowError {
  const { values, line } = row;
  const required = [
    "gtin14",
    "brand",
    "name",
    "raw_ingredients",
    "source_type",
    "source_url",
    "observed_at",
    "verification_status",
  ] as const;
  for (const field of required) {
    if (!values[field].trim()) {
      return { line, message: `${field} is required and cannot be invented` };
    }
  }

  const gtin = normalizeGtin(values.gtin14);
  if ("error" in gtin) {
    return { line, message: gtin.error };
  }

  const sourceType = SourceTypeSchema.safeParse(values.source_type.trim());
  if (!sourceType.success) {
    return { line, message: "source_type is not a known source type" };
  }

  const verification = VerificationStatusSchema.safeParse(
    values.verification_status.trim(),
  );
  if (!verification.success) {
    return { line, message: "verification_status is not a known verification status" };
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(values.source_url.trim());
  } catch {
    return { line, message: "source_url must be an absolute URL" };
  }
  if (sourceUrl.protocol !== "https:" && sourceUrl.protocol !== "http:") {
    return { line, message: "source_url must be http or https" };
  }

  const observed = Date.parse(values.observed_at.trim());
  if (Number.isNaN(observed)) {
    return { line, message: "observed_at must be a real ISO date" };
  }
  if (observed > Date.now()) {
    return { line, message: "observed_at cannot be in the future" };
  }

  const parsed = parseIngredients(values.raw_ingredients);
  if (parsed.ingredients.length === 0) {
    return { line, message: "raw_ingredients did not parse to any ingredients" };
  }

  const ingredientTextSha256 = sha256Text(values.raw_ingredients.trim());
  const slug = `${slugify(`${values.brand} ${values.name}`)}-${gtin.gtin14.slice(-6)}`;

  return {
    line,
    gtin14: gtin.gtin14,
    primaryUpc: emptyToNull(values.primary_upc) ?? gtin.digits,
    gtinFormat: gtin.format,
    brand: values.brand.trim(),
    name: values.name.trim(),
    variant: emptyToNull(values.variant),
    size: emptyToNull(values.size),
    category: emptyToNull(values.category),
    slug,
    rawIngredients: values.raw_ingredients.trim(),
    ingredientTextSha256,
    sourceType: sourceType.data,
    sourceUrl: sourceUrl.toString(),
    sourceTitle: emptyToNull(values.source_title),
    observedAt: new Date(observed).toISOString(),
    verificationStatus: verification.data,
    notes: emptyToNull(values.notes),
    idempotencyKey: `${gtin.gtin14}:${ingredientTextSha256}:${sourceUrl.toString()}`,
  };
}

export function planImport(csv: string, existing: CatalogRecord[] = []): ImportPlan {
  const parsed = parseImportCsv(csv);
  const accepted: ValidatedImportRow[] = [];
  const errors: ImportRowError[] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;
  let alreadyPresent = 0;
  const existingKeys = new Set(
    existing.map((row) => `${row.gtin14}:${row.ingredientTextSha256}:${row.sourceUrl}`),
  );

  for (const row of parsed) {
    const result = validateImportRow(row);
    if ("message" in result) {
      errors.push(result);
      continue;
    }
    if (seen.has(result.idempotencyKey)) {
      duplicatesInFile += 1;
      errors.push({
        line: result.line,
        message: "duplicate of an earlier row in this file",
      });
      continue;
    }
    seen.add(result.idempotencyKey);
    if (existingKeys.has(result.idempotencyKey)) {
      alreadyPresent += 1;
      continue;
    }
    accepted.push(result);
  }

  return { accepted, errors, duplicatesInFile, alreadyPresent };
}

export function summarizePlan(plan: ImportPlan, dryRun: boolean): ImportAudit {
  return {
    dryRun,
    totalRows: plan.accepted.length + plan.errors.length + plan.alreadyPresent,
    accepted: plan.accepted.length,
    created: dryRun ? 0 : plan.accepted.length,
    unchanged: plan.alreadyPresent,
    failed: plan.errors.length,
    errors: plan.errors,
  };
}

export interface CatalogWriter {
  findExisting(): Promise<CatalogRecord[]>;
  insertRow(row: ValidatedImportRow): Promise<"created" | "unchanged">;
}

export async function runImport(
  csv: string,
  writer: CatalogWriter | null,
  options: { dryRun: boolean },
): Promise<ImportAudit> {
  const existing = writer ? await writer.findExisting() : [];
  const plan = planImport(csv, existing);
  if (options.dryRun || !writer) {
    return summarizePlan(plan, true);
  }

  let created = 0;
  let unchanged = plan.alreadyPresent;
  const errors = [...plan.errors];
  for (const row of plan.accepted) {
    try {
      const result = await writer.insertRow(row);
      if (result === "created") created += 1;
      else unchanged += 1;
    } catch (error) {
      errors.push({
        line: row.line,
        message: error instanceof Error ? error.message : "row insert failed",
      });
    }
  }
  return {
    dryRun: false,
    totalRows: plan.accepted.length + plan.errors.length + plan.alreadyPresent,
    accepted: plan.accepted.length,
    created,
    unchanged,
    failed: errors.length,
    errors,
  };
}
