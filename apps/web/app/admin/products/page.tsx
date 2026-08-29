import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminProductsPage() {
  const auth = await requireAdmin(["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed)
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No product data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Products</h1>
      <p className="text-muted mt-3">
        Search, merge, and attach licensed images. Verified formulations are never
        silently overwritten.
      </p>
    </div>
  );
}
