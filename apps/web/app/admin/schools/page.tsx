import { requireAdmin } from "@/lib/auth/require-admin";
import Link from "next/link";

export default async function AdminSchoolsPage() {
  const auth = await requireAdmin(["REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed)
    return (
      <>
        <h1 className="text-2xl font-semibold">Regulatory admin access required</h1>
        <p className="text-muted mt-3">No school participation data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">School participation data is deferred</h1>
      <p className="text-muted mt-3">
        SnackCheck does not create school-by-school regulatory rules. Arizona&apos;s
        statewide ingredient determination remains separate from whether a school
        participates in a covered meal program.
      </p>
      <p className="text-muted mt-3">
        A future sourced import may show participation only when an Arizona Department of
        Education record, source date, and verification date are available. There are no
        manual participation or local-policy controls on this page.
      </p>
      <Link href="/admin/rules" className="mt-5 inline-block font-semibold underline">
        Return to statewide rules
      </Link>
    </div>
  );
}
