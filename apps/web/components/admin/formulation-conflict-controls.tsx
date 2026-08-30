"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Decision = "LEFT" | "RIGHT" | "NEITHER";

export function FormulationConflictControls({
  conflictId,
  leftUpdatedAt,
  rightUpdatedAt,
  leftEligible,
  rightEligible,
  open,
}: {
  conflictId: string;
  leftUpdatedAt: string;
  rightUpdatedAt: string;
  leftEligible: boolean;
  rightEligible: boolean;
  open: boolean;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<Decision | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!open)
    return <p className="text-muted text-sm">This conflict is already closed.</p>;

  async function decide(decision: Decision) {
    setBusy(decision);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/formulation-conflicts/${conflictId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, leftUpdatedAt, rightUpdatedAt, confirmed }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "The decision was not saved.");
      setMessage("The conflict decision and audit entry were recorded.");
      setConfirmed(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The decision was not saved.");
    } finally {
      setBusy(null);
    }
  }

  const choices: Array<{
    decision: Decision;
    label: string;
    variant: "primary" | "secondary";
    eligible: boolean;
  }> = [
    {
      decision: "LEFT",
      label: "Use left formulation",
      variant: "primary",
      eligible: leftEligible,
    },
    {
      decision: "RIGHT",
      label: "Use right formulation",
      variant: "primary",
      eligible: rightEligible,
    },
    {
      decision: "NEITHER",
      label: "Reject both",
      variant: "secondary",
      eligible: true,
    },
  ];
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
          I compared both ingredient lists, verification dates, and source evidence. I
          understand this decision changes which formulation is active.
        </span>
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Button
            key={choice.decision}
            type="button"
            variant={choice.variant}
            disabled={!confirmed || busy !== null || !choice.eligible}
            onClick={() => decide(choice.decision)}
          >
            {busy === choice.decision ? "Saving…" : choice.label}
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
