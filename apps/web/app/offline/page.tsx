export default function OfflinePage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold">You are offline</h1>
      <p className="text-muted">
        Cached product answers are not shown as current without their verification date.
        Reconnect to check a package.
      </p>
    </div>
  );
}
