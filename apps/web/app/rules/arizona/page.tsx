import type { Metadata } from "next";
import { BookOpen, Scale, ShieldCheck } from "lucide-react";
import { UnavailableRulesetState } from "@/components/public/page-states";
import { Card } from "@/components/ui/card";
import { LOCAL_RULES_DISCLAIMER } from "@/lib/copy";
import {
  isUsablePublishedRuleset,
  loadArizonaSources,
  loadPublishedArizonaRuleset,
} from "@/lib/rules/arizona";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Arizona Healthy Schools Act",
  path: "/rules/arizona",
  description:
    "Plain-language overview of Arizona’s school packaged-food ingredient restriction and the sources SnackCheck uses.",
});

export default async function ArizonaRulesPage() {
  const ruleset = await loadPublishedArizonaRuleset();
  const sources = await loadArizonaSources();
  const usable = isUsablePublishedRuleset(ruleset);
  const classroom = ruleset.contexts.find(
    (item) => item.context === "CLASSROOM_DISTRIBUTION",
  );
  const ownChild = ruleset.contexts.find((item) => item.context === "PARENT_OWN_CHILD");

  return (
    <article className="print-rules mx-auto flex max-w-5xl flex-col gap-6">
      <header className="hero-gradient overflow-hidden rounded-[32px] px-5 py-8 sm:px-9 sm:py-10">
        <span className="flex size-12 items-center justify-center rounded-[18px] bg-white/15">
          <Scale className="size-6" aria-hidden />
        </span>
        <p className="eyebrow mt-5">The rules, without the legal maze</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Arizona Healthy Schools Act
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/80">
          Beginning with the 2026–27 school year, A.R.S. § 15-242.01 restricts covered
          ultraprocessed food at schools that participate in a federally funded or
          assisted meal program. The statute names 11 ingredients.
        </p>
        {usable ? (
          <p className="mt-5 inline-flex rounded-full bg-black/15 px-4 py-2 font-mono text-xs text-white/80">
            Effective {ruleset.effectiveFrom}
            {ruleset.effectiveUntil ? ` through ${ruleset.effectiveUntil}` : ""} · version{" "}
            {ruleset.version} · {ruleset.rulesetHash}
          </p>
        ) : null}
      </header>
      {!usable ? <UnavailableRulesetState /> : null}

      <section className="glass-panel rounded-[28px] p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="bg-accent-soft text-accent flex size-10 items-center justify-center rounded-[15px]">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <h2 className="text-2xl font-bold">Classroom vs own child</h2>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Classroom distribution</h3>
            <p className="text-muted mt-2">
              {classroom?.publicSummary ??
                "ADE guidance treats campus-wide classroom distribution as in scope."}
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold">Your child’s own lunch or snack</h3>
            <p className="text-muted mt-2">
              {ownChild?.publicSummary ??
                "A parent or guardian may still provide covered food to that parent’s own student."}
            </p>
          </Card>
        </div>
      </section>

      <section className="glass-panel rounded-[28px] p-5 sm:p-7">
        <h2 className="text-2xl font-bold">Canonical substances</h2>
        {usable ? (
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {ruleset.substances
              .slice()
              .sort((a, b) => a.statutoryOrdinal - b.statutoryOrdinal)
              .map((substance) => (
                <li key={substance.id} className="bg-surface-strong rounded-[18px] p-4">
                  <p className="font-bold">
                    {substance.statutoryOrdinal}. {substance.canonicalName}
                  </p>
                  {substance.aliases.length > 0 ? (
                    <p className="text-muted text-sm">
                      Reviewed aliases:{" "}
                      {substance.aliases.map((alias) => alias.alias).join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
          </ol>
        ) : (
          <p className="text-muted">
            The 11 statutory names will appear here after a signed published ruleset is
            available. They are not shown from a development fixture.
          </p>
        )}
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="glass-panel rounded-[28px] p-5 sm:p-7">
          <h2 className="text-2xl font-bold">What PASS, FAIL, and VERIFY mean</h2>
          <ul className="text-muted mt-3 list-disc space-y-2 pl-5">
            <li>PASS: the current formulation did not match a prohibited ingredient.</li>
            <li>FAIL: a prohibited ingredient was matched on the package text.</li>
            <li>
              VERIFY: the evidence is incomplete, stale, conflicted, or unconfirmed.
            </li>
          </ul>
        </div>

        <div className="glass-panel rounded-[28px] p-5 sm:p-7">
          <h2 className="text-2xl font-bold">What SnackCheck does not decide</h2>
          <p className="text-muted mt-2">
            SnackCheck does not decide allergy safety, nutrition, school participation, or
            whether a specific campus will accept a food. AI never returns PASS, FAIL, or
            VERIFY.
          </p>
        </div>
      </section>

      <section className="glass-panel rounded-[28px] p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="bg-spark-soft text-spark flex size-10 items-center justify-center rounded-[15px]">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <h2 className="text-2xl font-bold">Primary sources</h2>
        </div>
        <ul className="mt-3 grid gap-3">
          {(sources.length > 0 ? sources : fallbackSources).map((source) => (
            <li key={source.url}>
              <Card>
                <p className="text-muted text-sm font-semibold uppercase tracking-wide">
                  {source.sourceType}
                </p>
                <a href={source.url} className="font-medium underline underline-offset-2">
                  {source.title}
                </a>
                <p className="text-muted mt-2 font-mono text-sm">
                  Published {source.publishedAt ?? "date not on file"} · retrieved{" "}
                  {source.retrievedAt}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-muted text-sm">{LOCAL_RULES_DISCLAIMER}</p>
    </article>
  );
}

const fallbackSources = [
  {
    title: "A.R.S. § 15-242.01",
    url: "https://www.azleg.gov/ars/15/00242-01.htm",
    sourceType: "STATUTE",
    publishedAt: null,
    retrievedAt: "see source page",
  },
];
