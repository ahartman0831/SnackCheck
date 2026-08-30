import Link from "next/link";
import {
  listSubmissionQueue,
  parseSubmissionQueueFilters,
} from "@/lib/admin/submission-queue";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseSubmissionQueueFilters(await searchParams);
  const submissions = await listSubmissionQueue(filters);
  if (!submissions)
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No submission data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Submissions</h1>
      <p className="text-muted mt-3">
        Find work by state or attention needed, then open the private evidence and audit
        history. Up to 50 matching submissions are shown.
      </p>
      <form className="border-border mt-6 grid gap-3 rounded-2xl border p-4 md:grid-cols-4">
        <label className="text-sm font-semibold">
          State
          <select
            name="state"
            defaultValue={filters.state}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          >
            <option value="all">All states</option>
            <option value="pending">Pending work</option>
            <option value="terminal">Finished or failed</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Attention
          <select
            name="attention"
            defaultValue={filters.attention}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          >
            <option value="all">Any</option>
            <option value="needs-review">Ready for review</option>
            <option value="low-confidence">Low confidence</option>
            <option value="failed">Has a failure</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Order
          <select
            name="order"
            defaultValue={filters.order}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Reference or barcode
          <input
            name="query"
            defaultValue={filters.query}
            placeholder="UUID or 8–14 digits"
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-4">
          <button className="bg-accent text-on-accent rounded-xl px-4 py-2 font-semibold">
            Apply filters
          </button>
          <Link href="/admin/submissions" className="rounded-xl px-4 py-2 underline">
            Clear
          </Link>
        </div>
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {submissions.map((item) => (
          <article key={item.id} className="border-border rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{item.status}</p>
              <code className="text-muted text-xs">{item.id.slice(0, 8)}</code>
            </div>
            <dl className="text-muted mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt>Created</dt>
              <dd>{new Date(item.createdAt).toLocaleString()}</dd>
              <dt>Confidence</dt>
              <dd>
                {item.confidence === null ? "—" : `${Math.round(item.confidence * 100)}%`}
              </dd>
              <dt>Barcode</dt>
              <dd>{item.gtin14 ?? "None"}</dd>
              <dt>Failure</dt>
              <dd>{item.failureCode ?? "—"}</dd>
            </dl>
            <Link
              href={`/admin/submissions/${item.id}`}
              className="mt-4 inline-block text-sm font-semibold underline"
            >
              Open private review
            </Link>
          </article>
        ))}
      </div>
      {submissions.length === 0 ? (
        <p className="text-muted mt-6">No submissions match these filters.</p>
      ) : null}
    </div>
  );
}
