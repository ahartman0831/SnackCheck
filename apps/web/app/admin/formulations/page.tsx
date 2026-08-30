import Link from "next/link";
import {
  listOpenFormulationConflicts,
  parseFormulationConflictFilters,
} from "@/lib/admin/formulation-conflicts";

export default async function AdminFormulationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFormulationConflictFilters(await searchParams);
  const conflicts = await listOpenFormulationConflicts(filters);
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
      <form className="border-border mt-6 grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_auto_auto]">
        <label className="text-sm font-semibold">
          Product or conflict reference
          <input
            name="query"
            defaultValue={filters.query}
            placeholder="Brand, product, or reference"
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          Order
          <select
            name="order"
            defaultValue={filters.order}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        <div className="flex items-end gap-3">
          <button className="bg-accent text-on-accent rounded-xl px-4 py-2 font-semibold">
            Apply
          </button>
          <Link href="/admin/formulations" className="px-2 py-2 underline">
            Clear
          </Link>
        </div>
      </form>
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
        <p className="text-muted mt-6">No open conflicts match these filters.</p>
      ) : null}
    </div>
  );
}
