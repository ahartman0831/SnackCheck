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
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function IngredientCheckForm() {
  const params = useSearchParams();
  const stored = useSyncExternalStore(subscribeDraft, readDraft, () => "");
  const [override, setOverride] = useState<string | null>(null);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const gtin = params.get("gtin");
  const request = params.get("request");
  const requestedQuery = params.get("q")?.slice(0, 80);
  const productSlug = params.get("product")?.slice(0, 120);
  const text = override ?? stored;

  function persist(next: string) {
    setOverride(next);
    setResult(null);
    setNotice(null);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The in-memory draft still works when browser storage is unavailable.
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const created = await fetch("/api/v1/uploads/ingredient-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gtin }),
      });
      const createdJson = await created.json();
      if (!created.ok) {
        if (createdJson.error?.code === "SUBMISSIONS_DISABLED") {
          const check = await fetch("/api/v1/evaluations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ingredients: text }),
          });
          const checked = await check.json();
          if (check.ok && checked.data) {
            setResult(checked.data);
            setNotice(
              "Checked without saving a review submission. This text has not been independently verified.",
            );
            return;
          }
        }
        setError(
          createdJson.error?.message ?? "Checking is unavailable. Your text was kept.",
        );
        return;
      }
      const submissionId = createdJson.data.submissionId as string;
      const extracted = await fetch(`/api/v1/submissions/${submissionId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedText: text }),
      });
      if (!extracted.ok) {
        const extractionJson = await extracted.json();
        setError(
          extractionJson.error?.message ??
            "Your text could not be processed. Please try again.",
        );
        return;
      }
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
      {request === "product" ? (
        <div className="bg-surface-strong rounded-[16px] px-4 py-3" role="status">
          <p className="font-semibold">Request a product check</p>
          <p className="text-muted mt-1 text-sm">
            {requestedQuery
              ? `No catalog match was found for “${requestedQuery}.” `
              : "This product is not in the current catalog. "}
            Paste the package ingredients to check it now. This does not automatically
            publish or approve a product record.
          </p>
        </div>
      ) : null}
      {request === "package-change" ? (
        <div
          className="bg-verify-surface text-verify rounded-[16px] px-4 py-3"
          role="status"
        >
          <p className="font-semibold">Report a package change</p>
          <p className="mt-1 text-sm">
            {productSlug ? `Current catalog product: ${productSlug}. ` : ""}
            Paste every word from the new ingredient panel. This check does not replace
            the current catalog record unless the new evidence is reviewed.
          </p>
        </div>
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
          maxLength={10_000}
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
      {notice ? (
        <p role="status" className="text-muted text-sm">
          {notice}
        </p>
      ) : null}
    </form>
  );
}
