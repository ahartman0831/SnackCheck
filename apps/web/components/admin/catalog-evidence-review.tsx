import type { CatalogReviewPacket } from "@/lib/catalog-evidence/review-packet";

export const NEXT_REVIEW_STEP = {
  COLLECT_INGREDIENT_EVIDENCE: "Collect ingredient evidence",
  RESOLVE_IDENTITY: "Resolve the barcode conflict",
  REPAIR_SOURCE_TEXT: "Check incomplete or malformed ingredient text",
  COMPARE_INGREDIENTS: "Compare the ingredient differences",
  VERIFY_IDENTITY_AND_DATE: "Verify package identity and evidence date",
};
const COMPARISON = {
  INGREDIENTS_MISSING: "Ingredient text missing",
  IDENTITY_CONFLICT: "Barcode conflict — do not use this source for this product",
  TEXT_NEEDS_REVIEW: "Ingredient text needs review",
  TEXT_MATCH: "Ingredient wording matches after normalization",
  TEXT_DIFFERS: "Ingredient wording differs",
};
function date(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not recorded";
  return new Date(value).toISOString().slice(0, 10);
}
export function CatalogEvidenceReview({
  packet,
  truncated,
}: {
  packet: CatalogReviewPacket;
  truncated: boolean;
}) {
  return (
    <section aria-labelledby="collected-evidence-title" className="flex flex-col gap-4">
      <div>
        <h2 id="collected-evidence-title" className="text-xl font-semibold">
          Collected evidence
        </h2>
        <p className="mt-2 font-semibold">Next: {NEXT_REVIEW_STEP[packet.nextStep]}</p>
        <p className="text-muted mt-2 text-sm">
          Compare these saved sources with the USDA ingredients above. Wording differences
          can reflect formatting or a changed recipe; they are not resolved automatically.
        </p>
        <p className="text-muted mt-2 text-sm">
          A matching barcode or ingredient list does not establish the current package,
          independent provenance or publication approval. Database update dates are not
          package-label dates.
        </p>
        {!packet.manufacturerIngredientsAvailable ? (
          <p className="text-muted mt-2 text-sm">
            Manufacturer ingredient evidence is still missing under the current
            publication workflow. Continue with licensed data and permitted sources;
            owner-supplied photos are optional.
          </p>
        ) : null}
        {packet.candidateParserWarnings.length ? (
          <p className="text-warning mt-2 text-sm">
            The USDA ingredient text also needs review:{" "}
            {packet.candidateParserWarnings.join(", ")}.
          </p>
        ) : null}
        {truncated ? (
          <p className="text-warning mt-2 text-sm">
            Showing the 20 most recent attempts. Older evidence may exist; this is not the
            complete history.
          </p>
        ) : null}
      </div>
      {packet.sources.map((source) => (
        <article key={source.id} className="border-border rounded-2xl border p-5">
          <h3 className="font-semibold">{source.title}</h3>
          <p className="mt-2 text-sm font-semibold">{COMPARISON[source.comparison]}</p>
          <dl className="text-muted mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt>Source type</dt>
            <dd>
              {source.sourceKind === "MANUFACTURER" ? "Manufacturer" : "Secondary source"}
            </dd>
            <dt>Product</dt>
            <dd>{source.productName ?? "Not recorded"}</dd>
            <dt>Brand</dt>
            <dd>{source.brand ?? "Not recorded"}</dd>
            <dt>Package size</dt>
            <dd>{source.quantity ?? "Not recorded"}</dd>
            <dt>Barcode</dt>
            <dd>{source.barcode ?? "Not established"}</dd>
            <dt>Record updated</dt>
            <dd>{date(source.recordUpdatedAt)}</dd>
            <dt>Collected</dt>
            <dd>{date(source.retrievedAt)}</dd>
            <dt>License</dt>
            <dd>{source.licenseIdentifier ?? "Not recorded — verify reuse rights"}</dd>
            <dt>Attribution</dt>
            <dd>{source.attribution ?? "Not recorded"}</dd>
          </dl>
          {source.ingredientText ? (
            <p className="bg-elevated mt-4 whitespace-pre-wrap rounded-xl p-4 text-sm">
              {source.ingredientText}
            </p>
          ) : (
            <p className="text-muted mt-4 text-sm">
              This attempt did not provide usable ingredient text.
            </p>
          )}
          {source.parserWarnings.length ? (
            <p className="text-warning mt-3 text-sm">
              Text warnings: {source.parserWarnings.join(", ")}
            </p>
          ) : null}
          {source.sourceUrl ? (
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-semibold underline"
            >
              Open evidence source
            </a>
          ) : null}
        </article>
      ))}
      {packet.attemptsWithoutSource.length ? (
        <div className="border-border rounded-2xl border p-4">
          <h3 className="font-semibold">Attempts without a saved source</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {packet.attemptsWithoutSource.map((attempt) => (
              <li key={attempt.id}>
                {date(attempt.createdAt)} · {attempt.outcome.replaceAll("_", " ")} ·{" "}
                {attempt.reason.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!packet.sources.length && !packet.attemptsWithoutSource.length ? (
        <p className="text-muted">
          No evidence collection attempts have been saved for this candidate yet.
        </p>
      ) : null}
    </section>
  );
}
