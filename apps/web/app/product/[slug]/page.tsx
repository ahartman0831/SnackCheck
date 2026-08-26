import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCAL_RULES_DISCLAIMER } from "@/lib/copy";
import { ContextPanels } from "@/components/compliance/context-panels";
import { StatusCard } from "@/components/compliance/status-card";
import { getProductBySlug } from "@/lib/products/repository";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const model = await getProductBySlug(slug);
  if (!model) {
    return { title: "Product not published" };
  }
  return {
    title: `${model.product.brand} ${model.product.name}`,
    description: `${model.classroom.explanation.headline}. Passing the ingredient check is not a school-policy approval.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = await getProductBySlug(slug);
  if (!model) {
    notFound();
  }

  const matches = model.classroom.matchedRules;

  return (
    <article className="flex flex-col gap-6">
      {model.product.labeledDevelopmentFixture ? (
        <p className="bg-verify-surface text-verify rounded-2xl px-4 py-3 text-sm">
          Development fixture — not real product data.
        </p>
      ) : null}
      <header>
        <p className="text-muted text-sm font-semibold uppercase tracking-wide">
          {model.product.brand}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">
          {model.product.name}
          {model.product.variant ? ` · ${model.product.variant}` : ""}
        </h1>
      </header>
      <StatusCard
        status={model.classroom.ingredientStatus}
        summary={model.classroom.explanation.summary}
      />
      <p className="text-muted">
        {matches.length} prohibited ingredient{matches.length === 1 ? "" : "s"} matched.
      </p>
      <ContextPanels classroom={model.classroom} ownChild={model.ownChild} />
      <p className="text-muted text-sm">School participation not verified.</p>
      {model.formulation ? (
        <section>
          <h2 className="text-xl font-semibold">Ingredients</h2>
          <p className="text-muted mt-2 whitespace-pre-wrap">
            {model.formulation.rawIngredients}
          </p>
        </section>
      ) : (
        <p className="text-muted">No formulation is on file. Verify this package.</p>
      )}
      {matches.map((match) => (
        <details
          key={`${match.aliasId}-${match.rawLabelValue}`}
          className="border-border bg-surface rounded-2xl border p-4"
        >
          <summary className="cursor-pointer font-semibold">
            {match.canonicalName}
          </summary>
          <p className="mt-2 text-sm">Detected label value: {match.rawLabelValue}</p>
          <p className="text-muted mt-1 text-sm">Match mode: {match.matchMode}</p>
        </details>
      ))}
      <section className="text-muted text-sm">
        <p>Trust: {model.formulation?.verificationStatus ?? "missing"}</p>
        <p>Last verified: {model.formulation?.lastVerifiedAt ?? "not verified"}</p>
        <p>
          Ruleset {model.classroom.rulesetHash.slice(0, 12)} · engine{" "}
          {model.classroom.engineVersion}
        </p>
      </section>
      <Link
        href="/scan/ingredients"
        className="font-semibold underline underline-offset-4"
      >
        Does your package look different? Scan the new label
      </Link>
      <p className="text-muted text-sm">{LOCAL_RULES_DISCLAIMER}</p>
    </article>
  );
}
