import Link from "next/link";
import { CatalogAiRunner } from "@/components/admin/catalog-ai-runner";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listCatalogCandidates,
  parseCatalogCandidateFilters,
} from "@/lib/admin/catalog-candidates";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseCatalogCandidateFilters(await searchParams);
  const [candidates, auth] = await Promise.all([
    listCatalogCandidates(filters),
    requireAdmin(),
  ]);
  if (!candidates)
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No catalog candidates were loaded.</p>
      </>
    );
  const admin = createAdminClient();
  const dossierIds =
    auth.role === "SUPER_ADMIN" && filters.route === "AUTO_EVIDENCE" && admin
      ? await admin
          .from("catalog_evidence_dossiers")
          .select("candidate_id")
          .in(
            "candidate_id",
            candidates.map(({ id }) => id),
          )
      : null;
  const dossierCandidateIds = new Set(
    dossierIds?.error
      ? []
      : (dossierIds?.data ?? []).map(({ candidate_id }) => candidate_id),
  );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Catalog candidates</h1>
      <p className="text-muted mt-3">
        Automated relevance, evidence collection, and deterministic ingredient rules do
        the routine work. Use this workspace for exceptions and quality sampling; a USDA
        lead alone never verifies a current package.
      </p>
      <form className="border-border mt-6 grid gap-3 rounded-2xl border p-4 md:grid-cols-6">
        <label className="text-sm font-semibold md:col-span-2">
          Product, brand, or GTIN
          <input
            name="query"
            defaultValue={filters.query}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          State
          <select
            name="state"
            defaultValue={filters.state}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          >
            <option value="REVIEW_QUEUED">Queued</option>
            <option value="SCREENED_PASS">Screened pass</option>
            <option value="SCREENED_VERIFY">Needs verification</option>
            <option value="SCREENED_FAIL">Screened fail</option>
            <option value="PROMOTED">Promoted</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Provider
          <select
            name="provider"
            defaultValue={filters.provider}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          >
            <option value="ALL">All</option>
            <option value="USDA_FDC">USDA</option>
            <option value="OPEN_FOOD_FACTS">Open Food Facts</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Automation route
          <select
            name="route"
            defaultValue={filters.route}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          >
            <option value="AUTO_EVIDENCE">Automatic evidence</option>
            <option value="HUMAN_EXCEPTION">Human exceptions</option>
            <option value="DEPRIORITIZED">Deprioritized</option>
            <option value="UNASSESSED">Unassessed</option>
            <option value="ALL">All routes</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="bg-accent text-on-accent rounded-xl px-4 py-2 font-semibold">
            Apply
          </button>
          <Link href="/admin/catalog" className="px-2 py-2 underline">
            Clear
          </Link>
        </div>
      </form>
      {auth.role === "SUPER_ADMIN" && filters.route === "AUTO_EVIDENCE" ? (
        <CatalogAiRunner
          candidates={candidates
            .filter(({ id }) => dossierCandidateIds.has(id))
            .map(({ id, brand, name, gtin14 }) => ({
              id,
              brand,
              name,
              gtin14,
            }))}
        />
      ) : null}
      <div className="mt-6 flex flex-col gap-3">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="border-border rounded-2xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  {candidate.brand} {candidate.name}
                </h2>
                <p className="text-muted mt-1 text-sm">
                  GTIN {candidate.gtin14} · {candidate.provider.replaceAll("_", " ")} ·{" "}
                  {candidate.screenStatus}
                </p>
              </div>
              <span className="bg-elevated rounded-full px-3 py-2 text-sm font-semibold">
                {candidate.automationRoute?.replaceAll("_", " ") ??
                  candidate.state.replaceAll("_", " ")}
              </span>
            </div>
            {candidate.qualityFlags.length ? (
              <p className="text-muted mt-3 text-sm">
                Quality flags: {candidate.qualityFlags.join(", ")}
              </p>
            ) : null}
            {candidate.relevanceTier ? (
              <p className="text-muted mt-2 text-sm">
                Classroom relevance: {candidate.relevanceTier.toLowerCase()} · score{" "}
                {candidate.relevanceScore}
              </p>
            ) : null}
            <Link
              href={`/admin/catalog/${candidate.id}`}
              className="mt-4 inline-block text-sm font-semibold underline"
            >
              Inspect candidate
            </Link>
          </article>
        ))}
      </div>
      {!candidates.length ? (
        <p className="text-muted mt-6">No candidates match these filters.</p>
      ) : null}
    </div>
  );
}
