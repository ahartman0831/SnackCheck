"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComplianceResult, IngredientExtraction } from "@snackcheck/contracts";
import { StatusCard } from "@/components/compliance/status-card";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";

type SubmissionView = {
  extraction: IngredientExtraction;
  confidence: number | null;
  imageUrl: string | null;
};

export function SubmissionConfirmation({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [view, setView] = useState<SubmissionView | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplianceResult | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/submissions/${submissionId}`)
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!active) return;
        if (!response.ok || !body.data?.extraction) {
          setError(body.error?.message ?? "The extraction could not be loaded.");
          return;
        }
        setView(body.data);
        setText(body.data.extraction.ingredientText ?? "");
      })
      .catch(() => active && setError("The extraction could not be loaded."));
    return () => {
      active = false;
    };
  }, [submissionId]);

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/submissions/${submissionId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctedText: text }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Confirmation failed.");
      setResult(body.data.result);
    } catch (caught) {
      setError(
        !navigator.onLine
          ? "You're offline. Reconnect and try again; your corrections are still here."
          : caught instanceof Error
            ? caught.message
            : "Confirmation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    await fetch(`/api/v1/submissions/${submissionId}`, { method: "DELETE" });
    router.push("/scan/ingredients");
  }

  if (error && !view)
    return (
      <p role="alert" className="text-fail">
        {error}
      </p>
    );
  if (!view)
    return (
      <p role="status" className="text-muted">
        Loading private extraction…
      </p>
    );

  return (
    <form onSubmit={confirm} className="flex flex-col gap-5">
      {view.imageUrl ? (
        <Image
          src={view.imageUrl}
          alt="Your sanitized ingredient panel"
          width={900}
          height={700}
          unoptimized
          className="max-h-[50vh] w-full rounded-2xl object-contain"
        />
      ) : null}
      <p className="text-muted text-sm">
        Confidence: {Math.round((view.confidence ?? 0) * 100)}%. Compare every word with
        the package and correct anything that is wrong. Nothing is evaluated until you
        press Confirm and check.
      </p>
      {view.extraction.warnings.length ? (
        <p role="status" className="text-verify text-sm">
          Review carefully: {view.extraction.warnings.join(", ").toLowerCase()}.
        </p>
      ) : null}
      <Field id="confirmed-ingredients" label="Ingredient text">
        <Textarea
          id="confirmed-ingredients"
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          Confirm and check
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => router.push("/scan/ingredients")}
        >
          Retake or paste instead
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-fail">
          {error}
        </p>
      ) : null}
      {result ? (
        <StatusCard
          status={result.ingredientStatus}
          summary={result.explanation.summary}
        />
      ) : null}
    </form>
  );
}
