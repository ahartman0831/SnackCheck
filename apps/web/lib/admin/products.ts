import "server-only";
import type { Json } from "@snackcheck/db-types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const REVIEW_ROLES = ["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"] as const;

export type ProductListFilters = {
  state: "active" | "inactive" | "all";
  query: string;
};

export type AdminProductSummary = {
  id: string;
  brand: string;
  name: string;
  variant: string | null;
  slug: string;
  gtin14: string | null;
  active: boolean;
  conflict: boolean;
  updatedAt: string;
  identifierCount: number;
  formulationCount: number;
};

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseProductListFilters(
  values: Record<string, string | string[] | undefined>,
): ProductListFilters {
  const state = single(values.state);
  return {
    state: state === "inactive" || state === "all" ? state : "active",
    query: single(values.query).trim().slice(0, 80),
  };
}

export async function listAdminProducts(
  filters: ProductListFilters,
): Promise<AdminProductSummary[] | null> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  let request = admin
    .from("products")
    .select("id,brand,name,variant,slug,gtin14,active,formulation_conflict,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (filters.state !== "all") request = request.eq("active", filters.state === "active");
  const products = await request;
  if (products.error) throw new Error("Products could not be loaded.");
  const ids = (products.data ?? []).map((item) => item.id);
  const [identifiers, formulations] = ids.length
    ? await Promise.all([
        admin.from("product_identifiers").select("product_id").in("product_id", ids),
        admin.from("formulations").select("product_id").in("product_id", ids),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (identifiers.error || formulations.error)
    throw new Error("Product evidence counts could not be loaded.");
  const identifierCounts = new Map<string, number>();
  const formulationCounts = new Map<string, number>();
  for (const item of identifiers.data ?? [])
    identifierCounts.set(
      item.product_id,
      (identifierCounts.get(item.product_id) ?? 0) + 1,
    );
  for (const item of formulations.data ?? [])
    formulationCounts.set(
      item.product_id,
      (formulationCounts.get(item.product_id) ?? 0) + 1,
    );
  const needle = filters.query.toLocaleLowerCase();
  return (products.data ?? [])
    .filter((item) =>
      needle
        ? `${item.id} ${item.brand} ${item.name} ${item.variant ?? ""} ${item.slug} ${item.gtin14 ?? ""}`
            .toLocaleLowerCase()
            .includes(needle)
        : true,
    )
    .map((item) => ({
      id: item.id,
      brand: item.brand,
      name: item.name,
      variant: item.variant,
      slug: item.slug,
      gtin14: item.gtin14,
      active: item.active,
      conflict: item.formulation_conflict,
      updatedAt: item.updated_at,
      identifierCount: identifierCounts.get(item.id) ?? 0,
      formulationCount: formulationCounts.get(item.id) ?? 0,
    }));
}

export type AdminProductDetail = AdminProductSummary & {
  size: string | null;
  category: string | null;
  imageUrl: string | null;
  imageAttribution: string | null;
  aliases: Array<{ alias: string }>;
  identifiers: Array<{
    type: string;
    raw: string;
    gtin14: string;
    primary: boolean;
  }>;
  formulations: Array<{
    id: string;
    version: number;
    status: string;
    active: boolean;
    updatedAt: string;
    lastVerifiedAt: string | null;
  }>;
  candidates: AdminProductSummary[];
  audit: Array<{ action: string; createdAt: string; after: Json | null }>;
};

export async function getAdminProduct(
  id: string,
): Promise<
  | { kind: "unauthorized" }
  | { kind: "not-found" }
  | { kind: "ready"; record: AdminProductDetail }
> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed) return { kind: "unauthorized" };
  const admin = createAdminClient();
  if (!admin) return { kind: "unauthorized" };
  const product = await admin.from("products").select("*").eq("id", id).maybeSingle();
  if (product.error) throw new Error("The product could not be loaded.");
  if (!product.data) return { kind: "not-found" };
  const [identifiers, aliases, formulations, audit, candidates] = await Promise.all([
    admin
      .from("product_identifiers")
      .select("identifier_type,raw_value,normalized_gtin14,is_primary")
      .eq("product_id", id),
    admin.from("product_aliases").select("alias").eq("product_id", id),
    admin
      .from("formulations")
      .select("id,version,verification_status,active,updated_at,last_verified_at")
      .eq("product_id", id)
      .order("version", { ascending: false }),
    admin
      .from("admin_audit_log")
      .select("action,created_at,after_json")
      .eq("entity_type", "product")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("products")
      .select("id,brand,name,variant,slug,gtin14,active,formulation_conflict,updated_at")
      .eq("active", true)
      .neq("id", id)
      .order("brand")
      .limit(100),
  ]);
  if ([identifiers, aliases, formulations, audit, candidates].some((item) => item.error))
    throw new Error("Some product evidence could not be loaded.");
  const candidateRows: AdminProductSummary[] = (candidates.data ?? []).map((item) => ({
    id: item.id,
    brand: item.brand,
    name: item.name,
    variant: item.variant,
    slug: item.slug,
    gtin14: item.gtin14,
    active: item.active,
    conflict: item.formulation_conflict,
    updatedAt: item.updated_at,
    identifierCount: 0,
    formulationCount: 0,
  }));
  return {
    kind: "ready",
    record: {
      id: product.data.id,
      brand: product.data.brand,
      name: product.data.name,
      variant: product.data.variant,
      slug: product.data.slug,
      gtin14: product.data.gtin14,
      active: product.data.active,
      conflict: product.data.formulation_conflict,
      updatedAt: product.data.updated_at,
      identifierCount: identifiers.data?.length ?? 0,
      formulationCount: formulations.data?.length ?? 0,
      size: product.data.size,
      category: product.data.category,
      imageUrl: product.data.image_url,
      imageAttribution: product.data.image_attribution,
      aliases: aliases.data ?? [],
      identifiers: (identifiers.data ?? []).map((item) => ({
        type: item.identifier_type,
        raw: item.raw_value,
        gtin14: item.normalized_gtin14,
        primary: item.is_primary,
      })),
      formulations: (formulations.data ?? []).map((item) => ({
        id: item.id,
        version: item.version,
        status: item.verification_status,
        active: item.active,
        updatedAt: item.updated_at,
        lastVerifiedAt: item.last_verified_at,
      })),
      candidates: candidateRows,
      audit: (audit.data ?? []).map((item) => ({
        action: item.action,
        createdAt: item.created_at,
        after: item.after_json,
      })),
    },
  };
}
