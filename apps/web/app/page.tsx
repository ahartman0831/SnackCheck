import Link from "next/link";
import { SearchForm } from "@/components/search/search-form";
import { LOCAL_RULES_DISCLAIMER } from "@/lib/copy";

const steps = [
  {
    title: "Search or scan",
    body: "Look up a packaged food by name, brand, or barcode.",
  },
  {
    title: "We apply Arizona’s published rules",
    body: "A deterministic engine checks the formulation against the versioned ingredient list. AI never decides the result.",
  },
  {
    title: "See the evidence",
    body: "PASS, FAIL, or VERIFY — with the exact label text, sources, and freshness.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="bg-surface rounded-3xl px-5 py-8 shadow-[var(--shadow)] sm:px-8">
        <p className="text-accent text-sm font-semibold uppercase tracking-[0.16em]">
          Arizona · 2026–27 school year
        </p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Can I Bring This?
        </h1>
        <p className="text-muted mt-4 max-w-2xl text-lg">
          Arizona changed the school snack rules. We made them searchable.
        </p>
        <div className="mt-8">
          <SearchForm />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href="/scan/barcode"
            className="bg-foreground text-background flex min-h-12 items-center justify-center rounded-2xl px-4 text-center font-semibold"
          >
            Scan barcode
          </Link>
          <Link
            href="/scan/ingredients"
            className="border-foreground flex min-h-12 items-center justify-center rounded-2xl border px-4 text-center font-semibold"
          >
            Scan ingredients
          </Link>
        </div>
        <Link
          href="/approved"
          className="text-accent-strong mt-4 inline-flex min-h-12 items-center font-semibold underline underline-offset-4"
        >
          Show me treats I CAN bring
        </Link>
        <p className="text-muted mt-6 text-sm">{LOCAL_RULES_DISCLAIMER}</p>
      </section>

      <section aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading" className="text-2xl font-semibold">
          How it works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="border-border bg-surface rounded-2xl border p-5"
            >
              <p className="text-accent text-sm font-semibold">Step {index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-muted mt-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <Link
          href="/rules/arizona"
          className="font-semibold underline underline-offset-4"
        >
          Read the Arizona sources
        </Link>
      </section>
    </div>
  );
}
