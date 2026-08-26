export default function AdminAnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="text-muted mt-3">
        Allowlisted events only. Top zero-result searches and unknown GTINs appear here
        when analytics_events is populated.
      </p>
    </div>
  );
}
