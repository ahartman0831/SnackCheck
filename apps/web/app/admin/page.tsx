import { getOperationsSnapshot } from "@/lib/admin/operations";

function formatAge(value: string | null) {
  if (!value) return "No queued work";
  const hours = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 3_600_000));
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export default async function AdminDashboardPage() {
  const snapshot = await getOperationsSnapshot();
  if (!snapshot)
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">
          Sign in with an account that is actively allowlisted as an administrator. No
          operational data was loaded.
        </p>
      </div>
    );

  const cards = [
    ["Pending review", snapshot.metrics.pendingSubmissions],
    ["Low confidence", snapshot.metrics.lowConfidenceExtractions],
    ["Product conflicts", snapshot.metrics.productConflicts],
    ["Stale evidence", snapshot.metrics.staleFormulations],
    ["Provider failures · 30d", snapshot.metrics.failedProviderCalls],
    ["Oldest queue item", formatAge(snapshot.metrics.oldestQueueItemAt)],
  ];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-muted text-sm">Role: {snapshot.role.replaceAll("_", " ")}</p>
        <h1 className="mt-1 text-3xl font-semibold">Operations dashboard</h1>
        <p className="text-muted mt-2">
          Work needing attention, provider health, and recent regulatory activity. Counts
          are operational—not public claims.
        </p>
      </header>
      <section
        aria-label="Queue summary"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map(([label, value]) => (
          <article
            key={label}
            className="border-border bg-elevated rounded-2xl border p-4"
          >
            <p className="text-muted text-sm">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </article>
        ))}
      </section>
      <section>
        <h2 className="text-xl font-semibold">AI usage · last 30 days</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <article className="border-border rounded-2xl border p-4">
            <p className="text-muted text-sm">Provider calls</p>
            <p className="mt-2 text-2xl font-semibold">{snapshot.metrics.aiCalls30d}</p>
          </article>
          <article className="border-border rounded-2xl border p-4">
            <p className="text-muted text-sm">Estimated spend</p>
            <p className="mt-2 text-2xl font-semibold">
              ${snapshot.metrics.aiSpend30dUsd.toFixed(6)}
            </p>
          </article>
          <article className="border-border rounded-2xl border p-4">
            <p className="text-muted text-sm">Average latency</p>
            <p className="mt-2 text-2xl font-semibold">
              {snapshot.metrics.averageLatencyMs === null
                ? "—"
                : `${(snapshot.metrics.averageLatencyMs / 1000).toFixed(1)}s`}
            </p>
          </article>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Recent submissions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-3">Created</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Confidence</th>
                <th className="pb-3">GTIN</th>
                <th className="pb-3">Failure</th>
                <th className="pb-3">Reference</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.recentSubmissions.map((item) => (
                <tr key={item.id} className="border-border border-t">
                  <td className="py-3">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="py-3 font-semibold">{item.status}</td>
                  <td className="py-3">
                    {item.confidence === null
                      ? "—"
                      : `${Math.round(item.confidence * 100)}%`}
                  </td>
                  <td className="py-3">{item.hasGtin ? "Present" : "None"}</td>
                  <td className="py-3">{item.failureCode ?? "—"}</td>
                  <td className="py-3 font-mono">{item.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshot.recentSubmissions.length === 0 ? (
            <p className="text-muted py-4">No submissions yet.</p>
          ) : null}
        </div>
      </section>
      <footer className="text-muted text-xs">
        Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()}.
      </footer>
    </div>
  );
}
