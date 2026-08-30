import "server-only";
import type { Json } from "@snackcheck/db-types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const REVIEW_ROLES = ["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"] as const;

export type FormulationConflictSummary = {
  id: string;
  createdAt: string;
  product: { id: string; brand: string; name: string; slug: string };
  left: { id: string; version: number; status: string; lastVerifiedAt: string | null };
  right: { id: string; version: number; status: string; lastVerifiedAt: string | null };
};

export type FormulationSide = {
  id: string;
  version: number;
  rawIngredients: string;
  normalizedIngredients: string;
  status: string;
  confidence: number | null;
  firstObservedAt: string;
  lastObservedAt: string;
  lastVerifiedAt: string | null;
  updatedAt: string;
  active: boolean;
  packagingNotes: string | null;
  ingredients: Array<{ ordinal: number; raw: string; normalized: string }>;
  sources: Array<{
    type: string;
    reference: string | null;
    url: string | null;
    observedAt: string;
  }>;
};

export type FormulationConflictDetail = {
  id: string;
  status: string;
  createdAt: string;
  product: { id: string; brand: string; name: string; slug: string; conflict: boolean };
  left: FormulationSide;
  right: FormulationSide;
  audit: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    requestId: string | null;
    createdAt: string;
    before: Json | null;
    after: Json | null;
  }>;
};

function safeSourceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function listOpenFormulationConflicts(): Promise<
  FormulationConflictSummary[] | null
> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  const conflicts = await admin
    .from("data_conflicts")
    .select("id,product_id,left_formulation_id,right_formulation_id,created_at")
    .eq("status", "OPEN")
    .is("resolved_at", null)
    .order("created_at", { ascending: true });
  if (conflicts.error)
    throw new Error("The formulation conflict queue could not be loaded.");
  if (!conflicts.data?.length) return [];

  const productIds = [...new Set(conflicts.data.map((row) => row.product_id))];
  const formulationIds = [
    ...new Set(
      conflicts.data.flatMap((row) => [
        row.left_formulation_id,
        row.right_formulation_id,
      ]),
    ),
  ];
  const [products, formulations] = await Promise.all([
    admin.from("products").select("id,brand,name,slug").in("id", productIds),
    admin
      .from("formulations")
      .select("id,version,verification_status,last_verified_at")
      .in("id", formulationIds),
  ]);
  if (products.error || formulations.error)
    throw new Error("The formulation conflict queue could not be loaded.");
  const productById = new Map((products.data ?? []).map((row) => [row.id, row]));
  const formulationById = new Map((formulations.data ?? []).map((row) => [row.id, row]));

  return conflicts.data.flatMap((row) => {
    const product = productById.get(row.product_id);
    const left = formulationById.get(row.left_formulation_id);
    const right = formulationById.get(row.right_formulation_id);
    if (!product || !left || !right) return [];
    return [
      {
        id: row.id,
        createdAt: row.created_at,
        product,
        left: {
          id: left.id,
          version: left.version,
          status: left.verification_status,
          lastVerifiedAt: left.last_verified_at,
        },
        right: {
          id: right.id,
          version: right.version,
          status: right.verification_status,
          lastVerifiedAt: right.last_verified_at,
        },
      },
    ];
  });
}

export async function getFormulationConflict(
  id: string,
): Promise<
  | { kind: "unauthorized" }
  | { kind: "not-found" }
  | { kind: "ready"; record: FormulationConflictDetail }
> {
  const auth = await requireAdmin([...REVIEW_ROLES]);
  if (!auth.allowed) return { kind: "unauthorized" };
  const admin = createAdminClient();
  if (!admin) return { kind: "unauthorized" };
  const conflict = await admin
    .from("data_conflicts")
    .select("id,product_id,left_formulation_id,right_formulation_id,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (conflict.error) throw new Error("The formulation conflict could not be loaded.");
  if (!conflict.data) return { kind: "not-found" };
  const row = conflict.data;
  const formulationIds = [row.left_formulation_id, row.right_formulation_id];
  const [product, formulations, ingredients, sources, audit] = await Promise.all([
    admin
      .from("products")
      .select("id,brand,name,slug,formulation_conflict")
      .eq("id", row.product_id)
      .maybeSingle(),
    admin
      .from("formulations")
      .select(
        "id,version,raw_ingredients,normalized_ingredient_text,verification_status,confidence,first_observed_at,last_observed_at,last_verified_at,updated_at,active,packaging_notes",
      )
      .in("id", formulationIds),
    admin
      .from("formulation_ingredients")
      .select("formulation_id,ordinal,raw_label_value,normalized_value")
      .in("formulation_id", formulationIds)
      .order("ordinal"),
    admin
      .from("formulation_sources")
      .select("formulation_id,source_type,source_reference,source_url,observed_at")
      .in("formulation_id", formulationIds)
      .order("observed_at", { ascending: false }),
    admin
      .from("admin_audit_log")
      .select("id,action,actor_user_id,request_id,created_at,before_json,after_json")
      .eq("entity_type", "formulation_conflict")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if ([product, formulations, ingredients, sources, audit].some((result) => result.error))
    throw new Error("Some formulation conflict evidence could not be loaded.");
  if (!product.data) return { kind: "not-found" };
  const byId = new Map((formulations.data ?? []).map((item) => [item.id, item]));

  function side(formulationId: string): FormulationSide | null {
    const item = byId.get(formulationId);
    if (!item) return null;
    return {
      id: item.id,
      version: item.version,
      rawIngredients: item.raw_ingredients,
      normalizedIngredients: item.normalized_ingredient_text,
      status: item.verification_status,
      confidence: item.confidence == null ? null : Number(item.confidence),
      firstObservedAt: item.first_observed_at,
      lastObservedAt: item.last_observed_at,
      lastVerifiedAt: item.last_verified_at,
      updatedAt: item.updated_at,
      active: item.active,
      packagingNotes: item.packaging_notes,
      ingredients: (ingredients.data ?? [])
        .filter((part) => part.formulation_id === formulationId)
        .map((part) => ({
          ordinal: part.ordinal,
          raw: part.raw_label_value,
          normalized: part.normalized_value,
        })),
      sources: (sources.data ?? [])
        .filter((source) => source.formulation_id === formulationId)
        .map((source) => ({
          type: source.source_type,
          reference: source.source_reference,
          url: safeSourceUrl(source.source_url),
          observedAt: source.observed_at,
        })),
    };
  }
  const left = side(row.left_formulation_id);
  const right = side(row.right_formulation_id);
  if (!left || !right) return { kind: "not-found" };
  return {
    kind: "ready",
    record: {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      product: {
        id: product.data.id,
        brand: product.data.brand,
        name: product.data.name,
        slug: product.data.slug,
        conflict: product.data.formulation_conflict,
      },
      left,
      right,
      audit: (audit.data ?? []).map((item) => ({
        id: item.id,
        action: item.action,
        actorUserId: item.actor_user_id,
        requestId: item.request_id,
        createdAt: item.created_at,
        before: item.before_json,
        after: item.after_json,
      })),
    },
  };
}
