import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FormulationConflictControls } from "@/components/admin/formulation-conflict-controls";
import {
  getFormulationConflict,
  type FormulationSide,
} from "@/lib/admin/formulation-conflicts";

function isSelectable(side: FormulationSide) {
  return (
    ["VERIFIED", "PACKAGE_VERIFIED"].includes(side.status) &&
    Boolean(side.lastVerifiedAt) &&
    side.sources.length > 0
  );
}

function EvidenceSide({ label, side }: { label: string; side: FormulationSide }) {
  const selectable = isSelectable(side);
  return (
    <article className="border-border rounded-2xl border p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-muted text-sm">{label}</p>
          <h2 className="text-xl font-semibold">Version {side.version}</h2>
        </div>
        <span className="bg-elevated rounded-full px-3 py-2 text-sm font-semibold">
          {side.status}
        </span>
      </div>
      <dl className="text-muted mt-4 grid grid-cols-2 gap-2 text-sm">
        <dt>Last observed</dt>
        <dd>{new Date(side.lastObservedAt).toLocaleString()}</dd>
        <dt>Last verified</dt>
        <dd>
          {side.lastVerifiedAt ? new Date(side.lastVerifiedAt).toLocaleString() : "Never"}
        </dd>
        <dt>Confidence</dt>
        <dd>
          {side.confidence === null ? "—" : `${Math.round(side.confidence * 100)}%`}
        </dd>
        <dt>Currently active</dt>
        <dd>{side.active ? "Yes" : "No"}</dd>
        <dt>Eligible to select</dt>
        <dd>{selectable ? "Yes" : "No — needs verified source evidence"}</dd>
      </dl>
      <h3 className="mt-5 font-semibold">Package ingredient text</h3>
      <p className="bg-elevated mt-2 whitespace-pre-wrap rounded-xl p-4 text-sm">
        {side.rawIngredients}
      </p>
      <h3 className="mt-5 font-semibold">Structured ingredients</h3>
      <ol className="mt-2 list-decimal pl-5 text-sm">
        {side.ingredients.map((item) => (
          <li key={item.ordinal}>{item.raw}</li>
        ))}
      </ol>
      {side.ingredients.length === 0 ? (
        <p className="text-muted mt-2 text-sm">No structured ingredients recorded.</p>
      ) : null}
      <h3 className="mt-5 font-semibold">Sources</h3>
      <div className="mt-2 flex flex-col gap-2">
        {side.sources.map((source, index) => (
          <div
            key={`${source.type}-${source.observedAt}-${index}`}
            className="bg-elevated rounded-xl p-3 text-sm"
          >
            <p className="font-semibold">{source.type.replaceAll("_", " ")}</p>
            <p className="text-muted mt-1">
              Observed {new Date(source.observedAt).toLocaleString()}
            </p>
            {source.reference ? <p className="mt-1">{source.reference}</p> : null}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block underline"
              >
                Open source
              </a>
            ) : null}
          </div>
        ))}
      </div>
      {side.sources.length === 0 ? (
        <p className="text-muted mt-2 text-sm">No source evidence recorded.</p>
      ) : null}
    </article>
  );
}

export default async function FormulationConflictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!parsed.success) notFound();
  const result = await getFormulationConflict(parsed.data);
  if (result.kind === "not-found") notFound();
  if (result.kind === "unauthorized")
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No formulation evidence was loaded.</p>
      </>
    );
  const conflict = result.record;
  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/admin/formulations" className="text-muted text-sm underline">
          ← Conflict queue
        </Link>
        <p className="text-muted mt-3 font-mono text-xs">{conflict.id}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">
            {conflict.product.brand} {conflict.product.name}
          </h1>
          <span className="bg-elevated rounded-full px-3 py-2 text-sm font-semibold">
            {conflict.status}
          </span>
        </div>
      </header>
      <section className="grid gap-6 lg:grid-cols-2">
        <EvidenceSide label="Left formulation" side={conflict.left} />
        <EvidenceSide label="Right formulation" side={conflict.right} />
      </section>
      <section>
        <h2 className="text-xl font-semibold">Resolution decision</h2>
        <p className="text-muted mt-2 text-sm">
          Only an already-verified formulation with source evidence can be activated.
          Rejecting both leaves no active formulation. The database rechecks your role and
          evidence timestamps in the same transaction.
        </p>
        <div className="mt-3">
          <FormulationConflictControls
            conflictId={conflict.id}
            leftUpdatedAt={conflict.left.updatedAt}
            rightUpdatedAt={conflict.right.updatedAt}
            leftEligible={isSelectable(conflict.left)}
            rightEligible={isSelectable(conflict.right)}
            open={conflict.status === "OPEN"}
          />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Audit history</h2>
        <div className="mt-3 flex flex-col gap-3">
          {conflict.audit.map((entry) => (
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
        {conflict.audit.length === 0 ? (
          <p className="text-muted mt-3">No decisions have been recorded.</p>
        ) : null}
      </section>
    </div>
  );
}
