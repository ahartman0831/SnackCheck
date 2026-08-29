import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminSchoolsPage() {
  const auth = await requireAdmin(["REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed)
    return (
      <>
        <h1 className="text-2xl font-semibold">Regulatory admin access required</h1>
        <p className="text-muted mt-3">No school or policy data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Schools and policies</h1>
      <p className="text-muted mt-3">
        No school is shown as participating without source provenance and a verification
        date.
      </p>
    </div>
  );
}
