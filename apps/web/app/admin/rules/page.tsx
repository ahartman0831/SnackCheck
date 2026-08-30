import { RulesetOperationControls } from "@/components/admin/ruleset-operation-controls";
import { listRulesetOperations } from "@/lib/rules/ruleset-admin";

export default async function AdminRulesPage() {
  const operations = await listRulesetOperations();
  if (!operations)
    return (
      <>
        <h1 className="text-2xl font-semibold">Regulatory admin access required</h1>
        <p className="text-muted mt-3">No ruleset data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Rulesets</h1>
      <p className="text-muted mt-3">
        Draft from a published version, require sources before enabling aliases, then
        publish an immutable snapshot. The signed reviewer and publisher must be different
        administrators.
      </p>
      <div className="mt-6 flex flex-col gap-5">
        {operations.rulesets.map((ruleset) => {
          const actionableBlockers = ruleset.blockers.filter(
            (blocker) => blocker !== "publisher is required",
          );
          return (
            <article key={ruleset.id} className="border-border rounded-2xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-muted text-sm">
                    {ruleset.code} · Version {ruleset.version}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{ruleset.title}</h2>
                </div>
                <span className="bg-elevated rounded-full px-3 py-2 text-sm font-semibold">
                  {ruleset.published ? "PUBLISHED" : "DRAFT"}
                </span>
              </div>
              <dl className="text-muted mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt>Effective</dt>
                  <dd className="text-foreground font-semibold">
                    {new Date(`${ruleset.effectiveFrom}T00:00:00Z`).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt>Canonical hash</dt>
                  <dd className="text-foreground font-mono text-xs">
                    {ruleset.rulesetHash?.slice(0, 16) ?? "Missing"}
                  </dd>
                </div>
                <div>
                  <dt>Signed review</dt>
                  <dd className="text-foreground font-semibold">
                    {ruleset.reviewedAt
                      ? new Date(ruleset.reviewedAt).toLocaleString()
                      : "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd className="text-foreground font-semibold">
                    {ruleset.publishedAt
                      ? new Date(ruleset.publishedAt).toLocaleString()
                      : "No"}
                  </dd>
                </div>
              </dl>
              {ruleset.reviewDocumentUrl ? (
                <a
                  href={ruleset.reviewDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm underline"
                >
                  Open signed review document
                </a>
              ) : null}
              <div className="mt-4">
                <h3 className="font-semibold">Publication checks</h3>
                {actionableBlockers.length ? (
                  <ul className="text-muted mt-2 list-disc pl-5 text-sm">
                    {actionableBlockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted mt-2 text-sm">
                    All pre-publication evidence checks pass.
                  </p>
                )}
              </div>
              <RulesetOperationControls
                rulesetId={ruleset.id}
                code={ruleset.code}
                expectedHash={ruleset.rulesetHash}
                published={ruleset.published}
                reviewedAt={ruleset.reviewedAt}
                reviewedByCurrentActor={ruleset.reviewedBy === operations.actorId}
                publicationBlockers={ruleset.blockers}
              />
            </article>
          );
        })}
      </div>
      {operations.rulesets.length === 0 ? (
        <p className="text-muted mt-6">No rulesets are available.</p>
      ) : null}
    </div>
  );
}
