import { describe, expect, it } from "vitest";
import {
  planImport,
  runImport,
  type CatalogRecord,
  type CatalogWriter,
  type ValidatedImportRow,
} from "../../lib/products/import-catalog";

const HEADER =
  "gtin14,primary_upc,brand,name,variant,size,category,raw_ingredients,source_type,source_url,source_title,observed_at,verification_status,notes";

// Valid UPC-A 036000291452
const validRow = [
  "036000291452",
  "036000291452",
  "North Mesa",
  "Plain Oat Bars",
  "",
  "6 oz",
  "bars",
  '"Whole grain oats, brown sugar, sunflower oil, salt"',
  "MANUFACTURER",
  "https://example.test/label",
  "Manufacturer label",
  "2026-08-01T00:00:00.000Z",
  "PACKAGE_VERIFIED",
  "",
].join(",");

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe("product importer", () => {
  it("dry-run accepts a sourced row and rejects invented or invalid evidence", () => {
    const planned = planImport(
      csv(
        validRow,
        [
          "",
          "",
          "Invented Brand",
          "Invented Snack",
          "",
          "",
          "",
          "",
          "MANUFACTURER",
          "",
          "",
          "",
          "VERIFIED",
          "",
        ].join(","),
        [
          "036000291453",
          "",
          "North Mesa",
          "Bad Check Digit",
          "",
          "",
          "bars",
          "Oats, salt",
          "MANUFACTURER",
          "https://example.test/label",
          "Label",
          "2026-08-01T00:00:00.000Z",
          "VERIFIED",
          "",
        ].join(","),
      ),
    );
    expect(planned.accepted).toHaveLength(1);
    expect(planned.accepted[0]?.brand).toBe("North Mesa");
    expect(planned.errors.some((error) => error.message.includes("required"))).toBe(true);
    expect(planned.errors.some((error) => error.message.includes("check digit"))).toBe(
      true,
    );
  });

  it("is idempotent across dry-run and apply against the same sourced row", async () => {
    const existing: CatalogRecord[] = [];
    const writer: CatalogWriter = {
      async findExisting() {
        return existing;
      },
      async insertRow(row: ValidatedImportRow) {
        const key = {
          gtin14: row.gtin14,
          ingredientTextSha256: row.ingredientTextSha256,
          sourceUrl: row.sourceUrl,
        };
        if (
          existing.some(
            (item) =>
              item.gtin14 === key.gtin14 &&
              item.ingredientTextSha256 === key.ingredientTextSha256 &&
              item.sourceUrl === key.sourceUrl,
          )
        ) {
          return "unchanged";
        }
        existing.push(key);
        return "created";
      },
    };

    const dry = await runImport(csv(validRow), writer, { dryRun: true });
    expect(dry.dryRun).toBe(true);
    expect(dry.accepted).toBe(1);
    expect(dry.created).toBe(0);
    expect(existing).toHaveLength(0);

    const first = await runImport(csv(validRow), writer, { dryRun: false });
    expect(first.created).toBe(1);
    expect(existing).toHaveLength(1);

    const second = await runImport(csv(validRow), writer, { dryRun: false });
    expect(second.created).toBe(0);
    expect(second.unchanged).toBe(1);
    expect(existing).toHaveLength(1);
  });

  it("detects duplicate rows inside the same file", () => {
    const planned = planImport(csv(validRow, validRow));
    expect(planned.accepted).toHaveLength(1);
    expect(planned.duplicatesInFile).toBe(1);
  });
});
