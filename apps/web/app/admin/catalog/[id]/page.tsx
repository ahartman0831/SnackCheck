import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CatalogCandidateControls } from "@/components/admin/catalog-candidate-controls";
import { getCatalogCandidate } from "@/lib/admin/catalog-candidates";

export default async function CatalogCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success) notFound();
  const result = await getCatalogCandidate(id.data);
  if (result.kind === "not-found") notFound();
  if (result.kind === "unauthorized")
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No candidate evidence was loaded.</p>
      </>
    );
  const candidate = result.record;
  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/admin/catalog" className="text-muted text-sm underline">
          ← Candidate queue
        </Link>
        <p className="text-muted mt-3 font-mono text-xs">{candidate.id}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">
            {candidate.brand} {candidate.name}
          </h1>
          <span className="bg-elevated rounded-full px-3 py-2 text-sm font-semibold">
            {candidate.state.replaceAll("_", " ")}
          </span>
        </div>
      </header>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="border-border rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">External source lead</h2>
          <dl className="text-muted mt-4 grid grid-cols-2 gap-2 text-sm">
            <dt>Provider</dt>
            <dd>{candidate.provider.replaceAll("_", " ")}</dd>
            <dt>External record</dt>
            <dd>{candidate.externalRecordId}</dd>
            <dt>GTIN</dt>
            <dd>{candidate.gtin14}</dd>
            <dt>Screen</dt>
            <dd>{candidate.screenStatus}</dd>
            <dt>Country</dt>
            <dd>{candidate.marketCountry}</dd>
            <dt>Discontinued</dt>
            <dd>{candidate.discontinued ? "Yes" : "No"}</dd>
            <dt>License</dt>
            <dd>{candidate.licenseIdentifier}</dd>
          </dl>
          {candidate.sourceUrl ? (
            <a
              href={candidate.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block underline"
            >
              Open provider record
            </a>
          ) : null}
          <p className="text-muted mt-3 text-sm">
            This provider record cannot by itself verify or approve a product.
          </p>
        </article>
        <article className="border-border rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">Automated screening</h2>
          <p className="mt-3 text-lg font-semibold">{candidate.screenStatus}</p>
          <p className="text-muted mt-2 text-sm">Engine {candidate.engineVersion}</p>
          <p className="text-muted mt-1 break-all text-xs">
            Ruleset {candidate.rulesetHash}
          </p>
          <h3 className="mt-4 font-semibold">Quality flags</h3>
          <p className="text-muted mt-2 text-sm">
            {candidate.qualityFlags.length
              ? candidate.qualityFlags.join(", ")
              : "None recorded"}
          </p>
          {candidate.relevanceTier ? (
            <>
              <h3 className="mt-4 font-semibold">Classroom relevance</h3>
              <p className="mt-2 text-sm font-semibold">
                {candidate.relevanceTier} · score {candidate.relevanceScore} ·{" "}
                {candidate.automationRoute?.replaceAll("_", " ")}
              </p>
              <p className="text-muted mt-2 text-sm">
                {candidate.relevanceReasons.join(", ")}
              </p>
              <p className="text-muted mt-2 text-xs">
                Policy {candidate.relevancePolicyVersion}
              </p>
            </>
          ) : null}
        </article>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Source ingredient text</h2>
        <p className="bg-elevated mt-3 whitespace-pre-wrap rounded-xl p-4">
          {candidate.rawIngredientText}
        </p>
      </section>
      {candidate.existingProduct ? (
        <section className="border-warning rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">Existing SnackCheck product found</h2>
          <p className="text-muted mt-2">
            {candidate.existingProduct.brand} {candidate.existingProduct.name}. A
            different ingredient list will create a conflict for review; it will not
            replace the active formula.
          </p>
          {candidate.existingProduct.formulations.map((formulation) => (
            <article
              key={formulation.id}
              className="bg-elevated mt-3 rounded-xl p-3 text-sm"
            >
              <p className="font-semibold">
                Version {formulation.version} · {formulation.status}
                {formulation.active ? " · active" : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{formulation.rawIngredients}</p>
            </article>
          ))}
        </section>
      ) : null}
      <section>
        <h2 className="text-xl font-semibold">Exception review and evidence sample</h2>
        <div className="mt-3">
          <CatalogCandidateControls
            candidateId={candidate.id}
            expectedUpdatedAt={candidate.updatedAt}
            state={candidate.state}
            defaults={{
              brand: candidate.brand,
              name: candidate.name,
              variant: candidate.variant ?? "",
              size: candidate.size ?? "",
              category: candidate.category ?? "",
              verifiedIngredientText: candidate.rawIngredientText,
            }}
          />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Audit history</h2>
        <div className="mt-3 flex flex-col gap-3">
          {candidate.audit.map((entry) => (
            <article key={entry.id} className="border-border rounded-2xl border p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold">{entry.action.replaceAll("_", " ")}</p>
                <time className="text-muted text-sm">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="text-muted mt-2 text-xs">
                Actor {entry.actorUserId?.slice(0, 8) ?? "system"} · Request{" "}
                {entry.requestId ?? "not recorded"}
              </p>
            </article>
          ))}
        </div>
        {!candidate.audit.length ? (
          <p className="text-muted mt-3">No decisions have been recorded.</p>
        ) : null}
      </section>
    </div>
  );
}
