import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminFormulationsPage() {
  const auth = await requireAdmin(["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed)
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No formulation data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Formulations</h1>
      <p className="text-muted mt-3">
        Activate, deactivate, mark stale, or open a conflict. Multiple active formulations
        require an explicit product conflict flag.
      </p>
    </div>
  );
}
