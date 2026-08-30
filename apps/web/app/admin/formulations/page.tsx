import Link from "next/link";
import { listOpenFormulationConflicts } from "@/lib/admin/formulation-conflicts";

export default async function AdminFormulationsPage() {
  const conflicts = await listOpenFormulationConflicts();
  if (!conflicts)
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No formulation data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Formulation conflicts</h1>
      <p className="text-muted mt-3">
        Compare source-backed versions before choosing an active formulation. Decisions
        are protected against stale evidence and written to the audit log.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {conflicts.map((conflict) => (
          <article key={conflict.id} className="border-border rounded-2xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  {conflict.product.brand} {conflict.product.name}
                </h2>
                <p className="text-muted mt-1 text-sm">
                  Opened {new Date(conflict.createdAt).toLocaleString()}
                </p>
              </div>
              <code className="text-muted text-xs">{conflict.id.slice(0, 8)}</code>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[conflict.left, conflict.right].map((side, index) => (
                <div key={side.id} className="bg-elevated rounded-xl p-3 text-sm">
                  <p className="font-semibold">
                    {index === 0 ? "Left" : "Right"} · Version {side.version}
                  </p>
                  <p className="text-muted mt-1">
                    {side.status} ·{" "}
                    {side.lastVerifiedAt
                      ? `verified ${new Date(side.lastVerifiedAt).toLocaleDateString()}`
                      : "not verified"}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href={`/admin/formulations/conflicts/${conflict.id}`}
              className="mt-4 inline-block text-sm font-semibold underline"
            >
              Compare evidence
            </Link>
          </article>
        ))}
      </div>
      {conflicts.length === 0 ? (
        <p className="text-muted mt-6">There are no open formulation conflicts.</p>
      ) : null}
    </div>
  );
}
