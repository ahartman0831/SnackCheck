import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContextPanels } from "@/components/compliance/context-panels";
import { StatusCard } from "@/components/compliance/status-card";
import { HighlightedText } from "@/components/public/highlighted-text";
import { ProductJsonLd } from "@/components/public/product-jsonld";
import { ProductShare } from "@/components/public/product-share";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FreshnessBadge } from "@/components/ui/freshness-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { LOCAL_RULES_DISCLAIMER } from "@/lib/copy";
import { publicAppUrl } from "@/lib/brand";
import { freshnessState } from "@/lib/products/approved-eligibility";
import { getProductBySlug } from "@/lib/products/repository";
import { ingredientActionLabel } from "@/lib/public-copy";
import { loadArizonaSources } from "@/lib/rules/arizona";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const model = await getProductBySlug(slug);
  if (!model) {
    return pageMetadata({
      title: "Product not published",
      path: `/product/${slug}`,
      index: false,
    });
  }
  const title = `${model.product.brand} ${model.product.name}`;
  return {
    ...pageMetadata({
      title,
      path: `/product/${model.product.slug}`,
      description: `${model.classroom.ingredientStatus}: ${model.classroom.explanation.headline}. Passing the ingredient check is not a school-policy approval.`,
    }),
    openGraph: {
      title: `${model.classroom.ingredientStatus} · ${title}`,
      description: model.classroom.explanation.summary,
    },
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
  const url = `${publicAppUrl()}/product/${model.product.slug}`;
  const sources = await loadArizonaSources();
  const freshness = freshnessState({
    lastVerifiedAt: model.formulation?.lastVerifiedAt ?? null,
    evaluationDate: model.classroom.evaluatedAt.slice(0, 10),
    freshnessCurrentDays: 180,
    freshnessAgingDays: 365,
  });

  return (
    <article className="flex flex-col gap-6">
      <ProductJsonLd model={model} />
      {model.product.labeledDevelopmentFixture ? (
        <p className="bg-verify-surface text-verify rounded-[16px] px-4 py-3 text-sm">
          Development fixture — not real product data.
        </p>
      ) : null}

      <header className="flex min-w-0 flex-col gap-4 sm:flex-row">
        <div className="bg-surface-strong flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-[16px] text-2xl font-semibold">
          {model.product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.product.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            model.product.brand.slice(0, 1)
          )}
        </div>
        <div className="min-w-0">
          <p className="text-muted text-sm font-semibold uppercase tracking-wide">
            {model.product.brand}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {model.product.name}
            {model.product.variant ? ` · ${model.product.variant}` : ""}
          </h1>
          {model.product.size ? (
            <p className="text-muted mt-1">{model.product.size}</p>
          ) : null}
          {model.product.primaryUpc || model.product.gtin14 ? (
            <p className="text-muted mt-2 font-mono text-sm">
              {model.product.primaryUpc ?? model.product.gtin14}
            </p>
          ) : null}
          {model.product.imageAttribution ? (
            <p className="text-muted mt-2 text-xs">{model.product.imageAttribution}</p>
          ) : null}
        </div>
      </header>

      <StatusCard
        status={model.classroom.ingredientStatus}
        summary={model.classroom.explanation.summary}
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={model.classroom.ingredientStatus} />
        <p className="text-muted">
          {matches.length} prohibited ingredient{matches.length === 1 ? "" : "s"} matched.
        </p>
      </div>

      <ContextPanels classroom={model.classroom} ownChild={model.ownChild} />
      <p className="text-muted text-sm">
        School participation is shown only when independently verified. It is not verified
        for this product.
      </p>

      {matches.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Matching evidence</h2>
          {matches.map((match) => {
            const source = sources.find((item) => item.id === match.regulatorySourceId);
            return (
              <Card key={`${match.aliasId}-${match.rawLabelValue}`}>
                <p className="font-semibold">{match.canonicalName}</p>
                <p className="mt-2 text-sm">
                  Package text:{" "}
                  <HighlightedText
                    text={match.rawLabelValue}
                    start={match.startOffset}
                    end={match.endOffset}
                  />
                </p>
                <p className="text-muted mt-1 font-mono text-sm">
                  Match mode: {match.matchMode}
                </p>
                {source ? (
                  <p className="text-muted mt-1 text-sm">Source: {source.title}</p>
                ) : match.regulatorySourceId ? (
                  <p className="text-muted mt-1 font-mono text-sm">
                    Source {match.regulatorySourceId}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </section>
      ) : null}

      {model.formulation ? (
        <section>
          <h2 className="text-xl font-semibold">Formulation evidence</h2>
          <p className="mt-2 whitespace-pre-wrap">{model.formulation.rawIngredients}</p>
          <div className="text-muted mt-3 flex flex-wrap gap-2 text-sm">
            <span className="font-mono">{model.formulation.verificationStatus}</span>
            <FreshnessBadge state={freshness} />
          </div>
          <p className="text-muted mt-2 font-mono text-sm">
            First observed {model.formulation.firstObservedAt} · last observed{" "}
            {model.formulation.lastObservedAt ?? "not recorded"} · last verified{" "}
            {model.formulation.lastVerifiedAt ?? "not verified"}
          </p>
          {model.formulation.sourceTitle ? (
            <p className="text-muted mt-2 text-sm">{model.formulation.sourceTitle}</p>
          ) : null}
        </section>
      ) : (
        <p className="text-muted">No formulation is on file. Verify this package.</p>
      )}

      <Accordion
        items={[
          {
            value: "repro",
            title: "Technical details",
            content: (
              <div className="flex flex-col gap-1 font-mono text-sm">
                <p>Ruleset {model.classroom.rulesetHash}</p>
                <p>Formulation {model.classroom.formulationHash}</p>
                <p>Engine {model.classroom.engineVersion}</p>
                <p>Evaluated {model.classroom.evaluatedAt}</p>
              </div>
            ),
          },
        ]}
      />

      <div className="flex flex-wrap gap-3">
        <ProductShare
          title={`${model.classroom.ingredientStatus} · ${model.product.name}`}
          text={model.classroom.explanation.headline}
          url={url}
        />
        <Button asChild variant="secondary">
          <Link href="/scan/ingredients">
            Does your package look different? {ingredientActionLabel()}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/support">Report a problem</Link>
        </Button>
      </div>
      <p className="text-muted text-sm">{LOCAL_RULES_DISCLAIMER}</p>
    </article>
  );
}
