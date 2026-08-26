"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-surface rounded-3xl p-8">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted mt-3">
        The page could not be loaded. Your previous answer was not changed.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-accent mt-6 min-h-12 rounded-2xl px-5 font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
