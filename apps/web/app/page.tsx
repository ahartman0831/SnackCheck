import type { Metadata } from "next";
import Link from "next/link";
import { ProductSearch } from "@/components/public/product-search";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/brand";
import { LOCAL_RULES_DISCLAIMER } from "@/lib/copy";
import {
  APP_SUPPORTING,
  APP_TAGLINE,
  barcodeActionLabel,
  ingredientActionLabel,
} from "@/lib/public-copy";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: APP_NAME,
    path: "/",
    description: `${APP_TAGLINE} ${APP_SUPPORTING}`,
  }),
  title: { absolute: APP_NAME },
};

const steps = [
  {
    title: "AI reads the package",
    body: "When a photo pipeline is enabled, AI may transcribe ingredient text. Today you search or paste the list. AI never decides PASS, FAIL, or VERIFY.",
  },
  {
    title: "Reviewed rules check the ingredients",
    body: "A deterministic engine applies the versioned Arizona list. Unpublished fixtures are not treated as current law.",
  },
  {
    title: "SnackCheck shows the evidence",
    body: "You see the status, the matched label text, sources, and freshness.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="brand-grid brand-noise bg-surface rounded-[20px] px-5 py-8 shadow-[var(--shadow)] sm:px-8">
        <p className="text-accent text-sm font-semibold uppercase tracking-[0.16em]">
          Arizona · 2026–27 school year
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {APP_TAGLINE}
        </h1>
        <p className="text-muted mt-4 max-w-2xl text-lg">{APP_SUPPORTING}</p>
        <div className="mt-8">
          <ProductSearch showAlternatives={false} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Button asChild>
            <Link href="/search">Search products</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/scan/barcode">{barcodeActionLabel()}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/scan/ingredients">{ingredientActionLabel()}</Link>
          </Button>
        </div>
        <Button asChild variant="secondary" className="mt-5">
          <Link href="/approved">Show me what I can bring</Link>
        </Button>
        <p className="text-muted mt-6 text-sm">{LOCAL_RULES_DISCLAIMER}</p>
      </section>

      <section aria-labelledby="process-heading">
        <h2 id="process-heading" className="text-2xl font-semibold">
          How a check works
        </h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card>
                <p className="text-accent text-sm font-semibold">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-muted mt-2">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
