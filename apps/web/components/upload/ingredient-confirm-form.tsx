"use client";

import { useState } from "react";
import { StatusCard } from "@/components/compliance/status-card";
import type { ComplianceResult } from "@snackcheck/contracts";

export function IngredientConfirmForm() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const created = await fetch("/api/v1/uploads/ingredient-label", { method: "POST" });
    const createdJson = await created.json();
    if (!created.ok) {
      setBusy(false);
      setError(createdJson.error?.message ?? "Upload is unavailable.");
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
    setBusy(false);
    if (!confirmed.ok) {
      setError(confirmedJson.error?.message ?? "Confirmation failed.");
      return;
    }
    setResult(confirmedJson.data.result);
  }

  return (
    <form onSubmit={confirm} className="flex flex-col gap-4">
      <label htmlFor="ingredient-text" className="font-medium">
        Ingredient text
      </label>
      <textarea
        id="ingredient-text"
        required
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="border-border bg-surface min-h-40 rounded-2xl border p-4"
      />
      <button
        type="submit"
        disabled={busy}
        className="bg-accent text-on-accent min-h-12 rounded-2xl font-semibold"
      >
        {busy ? "Checking…" : "Yes, check it"}
      </button>
      {error ? <p className="text-fail">{error}</p> : null}
      {result ? (
        <StatusCard
          status={result.ingredientStatus}
          summary={result.explanation.summary}
        />
      ) : null}
    </form>
  );
}
