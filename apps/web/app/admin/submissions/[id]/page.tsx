import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SubmissionModerationControls } from "@/components/admin/submission-moderation-controls";
import { ProductCreateControls } from "@/components/admin/product-create-controls";
import { getSubmissionReview } from "@/lib/admin/submission-review";

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default async function AdminSubmissionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!parsed.success) notFound();
  const result = await getSubmissionReview(parsed.data);
  if (result.kind === "not-found") notFound();
  if (result.kind === "unauthorized")
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No private submission evidence was loaded.</p>
      </>
    );
  const submission = result.record;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/admin/submissions" className="text-muted text-sm underline">
          ← Submission queue
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-muted font-mono text-xs">{submission.id}</p>
            <h1 className="mt-1 text-3xl font-semibold">Review submission</h1>
          </div>
          <span className="border-border bg-elevated rounded-full border px-3 py-2 text-sm font-semibold">
            {submission.status}
          </span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <article>
          <h2 className="text-xl font-semibold">Sanitized package evidence</h2>
          {submission.imageUrl ? (
            <Image
              src={submission.imageUrl}
              alt="Private sanitized ingredient panel"
              width={1200}
              height={900}
              unoptimized
              className="border-border mt-3 max-h-[65vh] w-full rounded-2xl border object-contain"
            />
          ) : (
            <p className="text-muted mt-3">No retained sanitized image is available.</p>
          )}
          {submission.image ? (
            <dl className="text-muted mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt>Dimensions</dt>
              <dd>
                {submission.image.width ?? "?"} × {submission.image.height ?? "?"}
              </dd>
              <dt>Size</dt>
              <dd>{Math.round(submission.image.byteSize / 1024)} KB</dd>
              <dt>Metadata stripped</dt>
              <dd>{submission.image.exifStripped ? "Yes" : "No"}</dd>
              <dt>Retention</dt>
              <dd>
                {submission.image.retentionUntil
                  ? new Date(submission.image.retentionUntil).toLocaleString()
                  : "Not recorded"}
              </dd>
            </dl>
          ) : null}
        </article>
        <article className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold">Evidence summary</h2>
            <dl className="text-muted mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt>Created</dt>
              <dd>{new Date(submission.createdAt).toLocaleString()}</dd>
              <dt>Confirmed</dt>
              <dd>
                {submission.confirmedAt
                  ? new Date(submission.confirmedAt).toLocaleString()
                  : "No"}
              </dd>
              <dt>Confidence</dt>
              <dd>
                {submission.confidence === null
                  ? "—"
                  : `${Math.round(submission.confidence * 100)}%`}
              </dd>
              <dt>GTIN</dt>
              <dd>{submission.gtin14 ?? "None"}</dd>
              <dt>Product</dt>
              <dd>
                {submission.product
                  ? `${submission.product.brand} ${submission.product.name}`
                  : "No linked product"}
              </dd>
              <dt>Failure</dt>
              <dd>{submission.failureCode ?? "—"}</dd>
            </dl>
          </div>
          <div>
            <h3 className="font-semibold">AI transcription</h3>
            <p className="border-border bg-elevated mt-2 whitespace-pre-wrap rounded-2xl border p-4 text-sm">
              {submission.extractedText ?? "No transcription"}
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Person-confirmed text</h3>
            <p className="border-border bg-elevated mt-2 whitespace-pre-wrap rounded-2xl border p-4 text-sm">
              {submission.confirmedText ?? "Not confirmed"}
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article>
          <h2 className="text-xl font-semibold">Parsed ingredients</h2>
          <pre className="border-border bg-elevated mt-3 max-h-96 overflow-auto rounded-2xl border p-4 text-xs">
            {json(submission.extractedIngredients)}
          </pre>
        </article>
        <article>
          <h2 className="text-xl font-semibold">Deterministic result</h2>
          <pre className="border-border bg-elevated mt-3 max-h-96 overflow-auto rounded-2xl border p-4 text-xs">
            {json(submission.evaluationResult)}
          </pre>
        </article>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Moderation decision</h2>
        <p className="text-muted mt-2 text-sm">
          The database rechecks your current role, rejects stale edits, and writes the
          decision to the audit log.
        </p>
        <div className="mt-3">
          <SubmissionModerationControls
            submissionId={submission.id}
            expectedUpdatedAt={submission.updatedAt}
            status={submission.status}
          />
        </div>
      </section>

      {submission.status === "APPROVED" &&
      !submission.product &&
      submission.gtin14 &&
      submission.confirmedText &&
      submission.image ? (
        <section>
          <h2 className="text-xl font-semibold">Create catalog product</h2>
          <p className="text-muted mt-2 text-sm">
            This action promotes the reviewed package evidence into a public,
            package-verified product. Check identity carefully; duplicate barcodes are
            blocked.
          </p>
          <div className="mt-3">
            <ProductCreateControls
              submissionId={submission.id}
              expectedUpdatedAt={submission.updatedAt}
              gtin14={submission.gtin14}
            />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold">Provider attempts and spend</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-3">Attempt</th>
                <th className="pb-3">Provider/model</th>
                <th className="pb-3">Outcome</th>
                <th className="pb-3">Latency</th>
                <th className="pb-3">Tokens</th>
                <th className="pb-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {submission.attempts.map((attempt) => (
                <tr key={attempt.id} className="border-border border-t">
                  <td className="py-3">{attempt.ordinal}</td>
                  <td className="py-3">
                    {attempt.provider} / {attempt.model}
                  </td>
                  <td className="py-3 font-semibold">{attempt.outcome}</td>
                  <td className="py-3">{(attempt.latencyMs / 1000).toFixed(1)}s</td>
                  <td className="py-3">
                    {(attempt.inputTokens ?? 0) + (attempt.outputTokens ?? 0)}
                  </td>
                  <td className="py-3">
                    {attempt.costUsd === null
                      ? "Unpriced"
                      : `$${attempt.costUsd.toFixed(7)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {submission.attempts.length === 0 ? (
            <p className="text-muted py-4">No provider calls were recorded.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Audit history</h2>
        <div className="mt-3 flex flex-col gap-3">
          {submission.audit.map((entry) => (
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
        {submission.audit.length === 0 ? (
          <p className="text-muted mt-3">No moderation actions have been recorded.</p>
        ) : null}
      </section>
    </div>
  );
}
