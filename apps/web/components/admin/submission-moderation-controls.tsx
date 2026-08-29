"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Decision = "REVIEW_PENDING" | "APPROVED" | "REJECTED";

export function SubmissionModerationControls({
  submissionId,
  expectedUpdatedAt,
  status,
}: {
  submissionId: string;
  expectedUpdatedAt: string;
  status: string;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<Decision | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const decisions: Array<{
    value: Decision;
    label: string;
    variant: "primary" | "secondary";
  }> =
    status === "EVALUATED"
      ? [
          { value: "REVIEW_PENDING", label: "Move to review", variant: "secondary" },
          { value: "APPROVED", label: "Approve", variant: "primary" },
          { value: "REJECTED", label: "Reject", variant: "secondary" },
        ]
      : status === "REVIEW_PENDING"
        ? [
            { value: "APPROVED", label: "Approve", variant: "primary" },
            { value: "REJECTED", label: "Reject", variant: "secondary" },
          ]
        : [];

  async function decide(decision: Decision) {
    setBusy(decision);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, expectedUpdatedAt, confirmed }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "The decision was not saved.");
      setMessage(`${decision.replaceAll("_", " ")} was recorded with an audit entry.`);
      setConfirmed(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The decision was not saved.");
    } finally {
      setBusy(null);
    }
  }

  if (!decisions.length) {
    return (
      <p className="text-muted text-sm">
        This submission has no available review transition.
      </p>
    );
  }

  return (
    <div className="border-border rounded-2xl border p-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span>
          I reviewed the package evidence, confirmed text, parsed ingredients, and
          deterministic result.
        </span>
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        {decisions.map((decision) => (
          <Button
            key={decision.value}
            type="button"
            variant={decision.variant}
            disabled={!confirmed || busy !== null}
            onClick={() => decide(decision.value)}
          >
            {busy === decision.value ? "Saving…" : decision.label}
          </Button>
        ))}
      </div>
      {message ? (
        <p role="status" className="text-muted mt-3 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
