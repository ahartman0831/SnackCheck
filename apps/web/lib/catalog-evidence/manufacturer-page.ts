import { z } from "zod";

const MAX_SNAPSHOT_TEXT = 10_000;
const JsonRecordSchema = z.record(z.string(), z.unknown());

export type ManufacturerPageSnapshot = {
  productName: string | null;
  brand: string | null;
  gtins: string[];
  quantity: string | null;
  ingredientText: string | null;
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, MAX_SNAPSHOT_TEXT) : null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function productRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(productRecords);
  const parsed = JsonRecordSchema.safeParse(value);
  if (!parsed.success) return [];
  const record = parsed.data;
  const type = record["@type"];
  const isProduct =
    type === "Product" || (Array.isArray(type) && type.includes("Product"));
  const nested = Object.values(record).flatMap(productRecords);
  return isProduct ? [record, ...nested] : nested;
}

function jsonLdProducts(html: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const pattern =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      records.push(...productRecords(JSON.parse(decodeHtml(match[1]))));
    } catch {
      // Malformed page metadata is ignored; it never becomes evidence by inference.
    }
  }
  return records;
}

function brand(record: Record<string, unknown>): string | null {
  const direct = text(record.brand);
  if (direct) return direct;
  const object = JsonRecordSchema.safeParse(record.brand);
  return object.success ? text(object.data.name) : null;
}

function gtins(record: Record<string, unknown>): string[] {
  const values = [record.gtin, record.gtin8, record.gtin12, record.gtin13, record.gtin14]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string | number =>
      ["string", "number"].includes(typeof value),
    )
    .map(String)
    .map((value) => value.replace(/\D/g, ""))
    .filter((value) => [8, 12, 13, 14].includes(value.length));
  return [...new Set(values)];
}

function meta(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return text(decodeHtml(match[1]));
  }
  return null;
}

const INGREDIENT_SECTION_STOP =
  /\b(?:nutrition(?:al)? facts?|allergen(?:s| information)?|contains|may contain|made on (?:a|the) line|directions|preparation|legal disclaimer|terms (?:and|&) conditions|privacy policy|add to cart)\b|©/i;
const INGREDIENT_BOILERPLATE =
  /\b(?:please refer to (?:the|your) (?:product )?label|product information can change|information updated|leaving smartlabel|shipping calculated|site navigation|log in|cookie preferences)\b/i;

export function isPlausibleIngredientStatement(value: string | null): boolean {
  if (!value) return false;
  const candidate = value.replace(/\s+/g, " ").trim();
  if (candidate.length < 3 || candidate.length > 1_500) return false;
  if (INGREDIENT_BOILERPLATE.test(candidate)) return false;
  const words = candidate.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length === 0 || words.length > 220) return false;
  return /[,.;()]/.test(candidate) || words.length <= 8;
}

function visibleIngredientWindow(html: string): string | null {
  const visible = decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
  const candidates: Array<{ value: string; score: number }> = [];
  const pattern = /\b(?:simple\s+)?ingredients?\s*:?\s*/gi;
  for (const match of visible.matchAll(pattern)) {
    const start = (match.index ?? 0) + match[0].length;
    if (/^or\s+less\b/i.test(visible.slice(start))) continue;
    const bounded = visible.slice(start, start + 3_000).split(INGREDIENT_SECTION_STOP)[0];
    const candidate = text(
      bounded.replace(/^(?:(?:simple\s+)?ingredients?\s*:?\s*)+/i, ""),
    );
    if (!isPlausibleIngredientStatement(candidate)) continue;
    const punctuation = candidate!.match(/[,();]/g)?.length ?? 0;
    const labeled = /simple\s+ingredients/i.test(match[0]) ? 20 : 0;
    candidates.push({
      value: candidate!,
      score: labeled + punctuation * 3 - Math.floor(candidate!.length / 400),
    });
  }
  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.value ?? null;
}

export function extractManufacturerPageSnapshot(
  body: string,
  mediaType: "text/html" | "application/json",
): ManufacturerPageSnapshot {
  let products: Record<string, unknown>[] = [];
  if (mediaType === "application/json") {
    try {
      products = productRecords(JSON.parse(body));
    } catch {
      products = [];
    }
  } else {
    products = jsonLdProducts(body);
  }
  const product = products[0] ?? {};
  const structuredIngredients =
    text(product.ingredients) ?? text(product.recipeIngredient);
  const titleMatch =
    mediaType === "text/html" ? body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) : null;

  return {
    productName:
      text(product.name) ??
      (mediaType === "text/html" ? meta(body, "og:title") : null) ??
      (titleMatch ? text(decodeHtml(titleMatch[1])) : null),
    brand: brand(product),
    gtins: products
      .flatMap(gtins)
      .filter((value, index, all) => all.indexOf(value) === index),
    quantity: text(product.size) ?? text(product.weight),
    ingredientText:
      structuredIngredients ??
      (mediaType === "text/html" ? visibleIngredientWindow(body) : null),
  };
}
