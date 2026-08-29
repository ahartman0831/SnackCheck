import { getOperationsSnapshot } from "@/lib/admin/operations";
import Link from "next/link";

export default async function AdminSubmissionsPage() {
  const snapshot = await getOperationsSnapshot();
  if (!snapshot)
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
        Review queue summary. Image and ingredient evidence remain private until a
        dedicated, audited detail view is added.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {snapshot.recentSubmissions.map((item) => (
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
              <dd>{item.hasGtin ? "Present" : "None"}</dd>
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
      {snapshot.recentSubmissions.length === 0 ? (
        <p className="text-muted mt-6">The submission queue is empty.</p>
      ) : null}
    </div>
  );
}
