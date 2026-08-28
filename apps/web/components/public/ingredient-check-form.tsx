"use client";

import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { ComplianceResult } from "@snackcheck/contracts";
import { StatusCard } from "@/components/compliance/status-card";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";

const STORAGE_KEY = "snackcheck-ingredient-draft";

function subscribeDraft(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readDraft() {
  return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
}

export function IngredientCheckForm() {
  const params = useSearchParams();
  const stored = useSyncExternalStore(subscribeDraft, readDraft, () => "");
  const [override, setOverride] = useState<string | null>(null);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const gtin = params.get("gtin");
  const text = override ?? stored;

  function persist(next: string) {
    setOverride(next);
    window.sessionStorage.setItem(STORAGE_KEY, next);
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await fetch("/api/v1/uploads/ingredient-label", { method: "POST" });
      const createdJson = await created.json();
      if (!created.ok) {
        setError(
          createdJson.error?.message ?? "Checking is unavailable. Your text was kept.",
        );
        return;
      }
      const submissionId = createdJson.data.submissionId as string;
      await fetch(`/api/v1/submissions/${submissionId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedText: text }),
      });
      const confirmed = await fetch(`/api/v1/submissions/${submissionId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctedText: text }),
      });
      const confirmedJson = await confirmed.json();
      if (!confirmed.ok) {
        setError(
          confirmedJson.error?.message ?? "Confirmation failed. Your text was kept.",
        );
        return;
      }
      setResult(confirmedJson.data.result);
    } catch {
      setError("The check could not finish. Your ingredient text is still here.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={confirm} className="flex flex-col gap-4">
      {gtin ? (
        <p className="text-muted font-mono text-sm">Preserved GTIN: {gtin}</p>
      ) : null}
      <Field
        id="ingredient-text"
        label="Ingredient list"
        hint="Copy the entire ingredients panel, including Contains and May contain. This check uses pasted text only."
        error={error ?? undefined}
      >
        <Textarea
          id="ingredient-text"
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "ingredient-text-error" : "ingredient-text-hint"}
          value={text}
          onChange={(event) => persist(event.target.value)}
        />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Checking…" : "Check this list"}
      </Button>
      {result ? (
        <StatusCard
          status={result.ingredientStatus}
          summary={result.explanation.summary}
        />
      ) : null}
    </form>
  );
}
