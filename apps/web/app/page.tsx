import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ListChecks,
  CheckCircle2,
  ScanLine,
  Search,
  ShieldCheck,
} from "lucide-react";
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
    icon: ListChecks,
    title: "Paste the ingredient list",
    body: "Copy the full ingredient panel from the package, check the text, and submit it. No account or photo is needed.",
  },
  {
    icon: ShieldCheck,
    title: "Reviewed rules check the ingredients",
    body: "SnackCheck compares your text with the published Arizona restrictions. If reviewed rules are unavailable, the result is VERIFY.",
  },
  {
    icon: CheckCircle2,
    title: "Understand the result",
    body: "Listed restrictions are flagged. A list without matches stays VERIFY until its package evidence is independently reviewed. Always check your school's policies.",
  },
];

const quickActions = [
  {
    href: "/scan/ingredients",
    icon: ListChecks,
    title: ingredientActionLabel(),
    body: "Start with the full ingredient panel",
    tone: "bg-[var(--sun-soft)] text-verify",
  },
  {
    href: "/search",
    icon: Search,
    title: "Find a product",
    body: "Search by name or brand",
    tone: "bg-[var(--accent-soft)] text-accent",
  },
  {
    href: "/scan/barcode",
    icon: ScanLine,
    title: barcodeActionLabel(),
    body: "Use the number on the package",
    tone: "bg-[var(--spark-soft)] text-[var(--spark)]",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      <section className="hero-gradient relative overflow-hidden rounded-[32px] px-5 py-7 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <div
          className="absolute -right-20 -top-28 size-72 rounded-full border border-white/20"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 right-24 size-64 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative grid items-center gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div>
            <p className="eyebrow">Arizona · Ingredient-screening beta</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {APP_TAGLINE}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
              {APP_SUPPORTING}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white text-[#352d91] hover:bg-white/90"
              >
                <Link href="/scan/ingredients">
                  <ListChecks className="size-5" aria-hidden />
                  Check an ingredient list
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border border-white/25 bg-white/10 text-white shadow-none hover:bg-white/20"
              >
                <Link href="/rules/arizona">See how it works</Link>
              </Button>
            </div>
          </div>

          <div className="bg-white/12 rounded-[28px] border border-white/20 p-3 shadow-2xl backdrop-blur-md sm:p-4">
            <div className="rounded-[22px] bg-white p-4 text-[#10122a] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-accent flex size-10 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                  <Search className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-bold">Already in the catalog?</p>
                  <p className="text-sm text-[#687086]">Search by product or brand</p>
                </div>
              </div>
              <ProductSearch showAlternatives={false} />
              <p className="mt-3 text-sm text-[#687086]">
                Catalog coverage is limited during the beta. If your product is missing,
                paste its ingredient list to check it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="choose-heading">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Three easy ways</p>
            <h2
              id="choose-heading"
              className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Check it your way
            </h2>
          </div>
          <p className="text-muted max-w-md text-base">
            Start with the fastest option for the package you have. You can always switch
            methods.
          </p>
        </div>
        <ul className="mt-7 grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.href}>
                <Link
                  href={action.href}
                  aria-label={action.title}
                  className="group block h-full"
                >
                  <Card className="interactive-card flex h-full items-center gap-4 p-4 sm:p-5">
                    <span
                      className={`size-13 flex shrink-0 items-center justify-center rounded-[18px] ${action.tone}`}
                    >
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{action.title}</h3>
                      <p className="text-muted mt-0.5 text-sm">{action.body}</p>
                    </div>
                    <ArrowRight
                      className="text-muted size-5 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="process-heading"
        className="rounded-[32px] bg-[var(--surface-strong)] px-5 py-8 sm:px-8 sm:py-10"
      >
        <div className="max-w-2xl">
          <p className="eyebrow bg-surface">Clear, not mysterious</p>
          <h2 id="process-heading" className="mt-3 text-3xl font-bold tracking-tight">
            How a check works
          </h2>
          <p className="text-muted mt-2">
            The app separates reading a label from deciding the result, so every answer
            stays explainable.
          </p>
        </div>
        <ol className="mt-7 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative">
                <Card className="bg-surface h-full border-0 p-6">
                  <div className="flex items-center justify-between">
                    <span className="bg-accent-soft text-accent flex size-11 items-center justify-center rounded-[16px]">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-muted text-3xl font-black">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                  <p className="text-muted mt-2 text-sm leading-relaxed">{step.body}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-muted mx-auto max-w-3xl text-center text-sm">
        {LOCAL_RULES_DISCLAIMER}
      </p>
    </div>
  );
}
