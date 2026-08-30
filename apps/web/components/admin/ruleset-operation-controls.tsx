"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RulesetOperationControls({
  rulesetId,
  code,
  expectedHash,
  published,
  reviewedAt,
  reviewedByCurrentActor,
  publicationBlockers,
}: {
  rulesetId: string;
  code: string;
  expectedHash: string | null;
  published: boolean;
  reviewedAt: string | null;
  reviewedByCurrentActor: boolean;
  publicationBlockers: string[];
}) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentHash, setDocumentHash] = useState("");
  const [publishText, setPublishText] = useState("");
  const [busy, setBusy] = useState<"clone" | "review" | "publish" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const prePublishBlockers = publicationBlockers.filter(
    (blocker) => blocker !== "publisher is required",
  );

  async function submit(path: string, body: unknown, action: typeof busy) {
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message ?? "The ruleset action was not saved.");
      setMessage("The ruleset action and audit entry were recorded.");
      setAcknowledged(false);
      setPublishText("");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The ruleset action was not saved.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!expectedHash)
    return (
      <p className="text-muted text-sm">
        This ruleset has no canonical hash, so operations are blocked.
      </p>
    );

  return (
    <div className="border-border mt-4 rounded-2xl border p-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span className="text-sm">
          I reviewed this version, its canonical hash, sources, blockers, and current
          publication state.
        </span>
      </label>

      {published ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={!acknowledged || busy !== null}
            onClick={() =>
              submit(
                "/api/admin/rulesets/clone",
                { sourceRulesetId: rulesetId, expectedHash, confirmed: true },
                "clone",
              )
            }
          >
            {busy === "clone" ? "Cloning…" : "Clone to new draft"}
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">Record signed review</h3>
            <label className="mt-3 block text-sm">
              HTTPS review document
              <input
                type="url"
                value={documentUrl}
                onChange={(event) => setDocumentUrl(event.target.value)}
                className="border-border bg-elevated mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="https://…"
              />
            </label>
            <label className="mt-3 block text-sm">
              Lowercase SHA-256
              <input
                value={documentHash}
                onChange={(event) => setDocumentHash(event.target.value.trim())}
                className="border-border bg-elevated mt-1 w-full rounded-xl border px-3 py-2 font-mono text-xs"
                placeholder="64 hexadecimal characters"
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              disabled={
                !acknowledged ||
                busy !== null ||
                !documentUrl.startsWith("https://") ||
                !/^[0-9a-f]{64}$/.test(documentHash)
              }
              onClick={() =>
                submit(
                  "/api/admin/rulesets/review",
                  {
                    rulesetId,
                    expectedHash,
                    reviewDocumentUrl: documentUrl,
                    reviewDocumentHash: documentHash,
                    confirmed: true,
                  },
                  "review",
                )
              }
            >
              {busy === "review" ? "Recording…" : "Record review"}
            </Button>
          </div>
          <div>
            <h3 className="font-semibold">Publish immutable snapshot</h3>
            <p className="text-muted mt-2 text-sm">
              Publication changes public compliance results. A different administrator
              must publish after the signed review.
            </p>
            <label className="mt-3 block text-sm">
              Type PUBLISH
              <input
                value={publishText}
                onChange={(event) => setPublishText(event.target.value)}
                className="border-border bg-elevated mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <Button
              type="button"
              className="mt-3"
              disabled={
                !acknowledged ||
                busy !== null ||
                publishText !== "PUBLISH" ||
                !reviewedAt ||
                reviewedByCurrentActor ||
                prePublishBlockers.length > 0
              }
              onClick={() =>
                submit(
                  "/api/admin/rulesets/publish",
                  {
                    rulesetId,
                    expectedHash,
                    expectedReviewedAt: reviewedAt,
                    confirmation: "PUBLISH",
                  },
                  "publish",
                )
              }
            >
              {busy === "publish" ? "Publishing…" : `Publish ${code}`}
            </Button>
            {reviewedByCurrentActor ? (
              <p className="text-muted mt-2 text-sm">
                You recorded this review; another administrator must publish it.
              </p>
            ) : null}
          </div>
        </div>
      )}
      {message ? (
        <p role="status" className="text-muted mt-3 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
