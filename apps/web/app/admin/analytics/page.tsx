import { getOperationsSnapshot } from "@/lib/admin/operations";

export default async function AdminAnalyticsPage() {
  const snapshot = await getOperationsSnapshot();
  if (!snapshot)
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No analytics or provider data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Health and spend</h1>
      <p className="text-muted mt-3">
        Privacy-safe demand signals and provider operations for the last 30 days.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["AI calls", snapshot.metrics.aiCalls30d],
          ["Estimated AI spend", `$${snapshot.metrics.aiSpend30dUsd.toFixed(6)}`],
          ["Zero-result searches", snapshot.metrics.zeroResultSearches],
          ["Unknown barcodes", snapshot.metrics.unknownGtins],
        ].map(([label, value]) => (
          <article key={label} className="border-border rounded-2xl border p-4">
            <p className="text-muted text-sm">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="pb-3">Time</th>
              <th className="pb-3">Provider</th>
              <th className="pb-3">Model</th>
              <th className="pb-3">Outcome</th>
              <th className="pb-3">Latency</th>
              <th className="pb-3">Estimated cost</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.recentProviderCalls.map((call) => (
              <tr
                key={`${call.occurredAt}-${call.provider}-${call.model}`}
                className="border-border border-t"
              >
                <td className="py-3">{new Date(call.occurredAt).toLocaleString()}</td>
                <td className="py-3">{call.provider}</td>
                <td className="py-3">{call.model}</td>
                <td className="py-3 font-semibold">{call.outcome}</td>
                <td className="py-3">{(call.latencyMs / 1000).toFixed(1)}s</td>
                <td className="py-3">
                  {call.estimatedCostUsd === null
                    ? "Unpriced"
                    : `$${call.estimatedCostUsd.toFixed(7)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
