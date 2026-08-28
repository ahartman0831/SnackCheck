import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseIngredients } from "@snackcheck/compliance";
import { createClient } from "@supabase/supabase-js";
import {
  planImport,
  runImport,
  summarizePlan,
  type CatalogRecord,
  type CatalogWriter,
  type ValidatedImportRow,
} from "../apps/web/lib/products/import-catalog";

function parseArgs(argv: string[]) {
  const fileIndex = argv.findIndex((arg) => arg === "--file");
  const file = fileIndex >= 0 ? argv[fileIndex + 1] : argv[0];
  return {
    file,
    dryRun: argv.includes("--dry-run") || !argv.includes("--apply"),
  };
}

function createSupabaseWriter(): CatalogWriter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to apply.",
    );
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  return {
    async findExisting(): Promise<CatalogRecord[]> {
      const { data: products, error } = await admin
        .from("products")
        .select("id, gtin14")
        .not("gtin14", "is", null);
      if (error) throw error;
      const records: CatalogRecord[] = [];
      for (const product of products ?? []) {
        if (!product.gtin14) continue;
        const { data: formulations } = await admin
          .from("formulations")
          .select("id, ingredient_text_sha256")
          .eq("product_id", product.id);
        for (const formulation of formulations ?? []) {
          const { data: sources } = await admin
            .from("formulation_sources")
            .select("source_url")
            .eq("formulation_id", formulation.id);
          for (const source of sources ?? []) {
            if (!source.source_url) continue;
            records.push({
              gtin14: product.gtin14,
              ingredientTextSha256: formulation.ingredient_text_sha256,
              sourceUrl: source.source_url,
            });
          }
        }
      }
      return records;
    },

    async insertRow(row: ValidatedImportRow): Promise<"created" | "unchanged"> {
      const parsed = parseIngredients(row.rawIngredients);
      const result = await admin.rpc("import_catalog_row", {
        p_gtin14: row.gtin14,
        p_primary_upc: row.primaryUpc,
        p_identifier_type: row.gtinFormat,
        p_brand: row.brand,
        p_name: row.name,
        p_variant: row.variant,
        p_size: row.size,
        p_category: row.category,
        p_slug: row.slug,
        p_raw_ingredients: row.rawIngredients,
        p_normalized_ingredient_text: parsed.normalizedText,
        p_ingredient_text_sha256: row.ingredientTextSha256,
        p_source_type: row.sourceType as
          | "STATUTE"
          | "AGENCY_GUIDANCE"
          | "MANUFACTURER"
          | "PACKAGE_PHOTO"
          | "EXTERNAL_DATABASE"
          | "COMMUNITY_SUBMISSION"
          | "ADMIN_ENTRY",
        p_source_url: row.sourceUrl,
        p_source_title: row.sourceTitle,
        p_observed_at: row.observedAt,
        p_verification_status: row.verificationStatus as
          | "VERIFIED"
          | "PACKAGE_VERIFIED"
          | "EXTERNAL_DATABASE"
          | "COMMUNITY_SUBMITTED"
          | "STALE"
          | "CONFLICT"
          | "REJECTED",
        p_notes: row.notes,
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data === "unchanged" ? "unchanged" : "created";
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error(
      "Usage: pnpm exec tsx scripts/import-products.ts --file scripts/import-template.csv [--dry-run|--apply]",
    );
    process.exit(1);
  }

  const csv = readFileSync(resolve(process.cwd(), args.file), "utf8");
  if (args.dryRun) {
    const plan = planImport(csv);
    const audit = summarizePlan(plan, true);
    console.log(JSON.stringify({ plan, audit }, null, 2));
    return;
  }

  const audit = await runImport(csv, createSupabaseWriter(), { dryRun: false });
  console.log(JSON.stringify({ audit }, null, 2));
  if (audit.failed > 0) {
    process.exit(1);
  }
}

void main();
