import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="bg-surface rounded-3xl p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted mt-3">
        That address is not a public product, search, or rules page.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-12 items-center font-semibold underline underline-offset-4"
      >
        Back to home
      </Link>
    </div>
  );
}
