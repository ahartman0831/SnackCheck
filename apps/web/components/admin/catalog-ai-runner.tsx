"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Candidate = {
  id: string;
  brand: string;
  name: string;
  gtin14: string;
};

type RunResult = {
  runId: string;
  summary: {
    attempted_candidates: number;
    continued_candidates: number;
    human_exception_candidates: number;
    failed_candidates: number;
    estimated_total_cost_usd: number;
  };
  outcomes: Array<{
    candidateId: string;
    identity: string | null;
    ingredientAgreement: string | null;
    advisoryRoute: string;
    confidence: number | null;
    failureCode: string | null;
  }>;
};

export function CatalogAiRunner({ candidates }: { candidates: Candidate[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  function toggle(candidateId: string) {
    setSelected((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : current.length < 5
          ? [...current, candidateId]
          : current,
    );
  }

  async function run() {
    setBusy(true);
    setMessage(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/catalog-evidence/ai-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: selected,
          confirmation: "RUN_STAGING_AI_COMPARISON",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "The comparison did not run.");
      }
      setResult(payload.data);
      setMessage(
        "Comparison saved. AI advice did not approve, reject, or publish any product.",
      );
      setSelected([]);
      setConfirmed(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The comparison did not run.");
    } finally {
      setBusy(false);
    }
  }

  if (!candidates.length) return null;

  return (
    <section className="border-border bg-elevated mt-6 rounded-2xl border p-5">
      <h2 className="text-xl font-semibold">Controlled AI evidence check</h2>
      <p className="text-muted mt-2 text-sm">
        Owner-only staging tool. Choose 1–5 products with collected manufacturer evidence.
        AI compares identity and ingredients; deterministic rules still make every product
        decision.
      </p>
      <div className="mt-4 grid gap-2">
        {candidates.map((candidate) => (
          <label
            key={candidate.id}
            className="border-border bg-surface flex items-start gap-3 rounded-xl border p-3"
          >
            <input
              type="checkbox"
              checked={selected.includes(candidate.id)}
              onChange={() => toggle(candidate.id)}
              disabled={!selected.includes(candidate.id) && selected.length >= 5}
              className="mt-1 h-5 w-5"
            />
            <span>
              <span className="block font-semibold">
                {candidate.brand} {candidate.name}
              </span>
              <span className="text-muted text-xs">GTIN {candidate.gtin14}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span className="text-sm">
          I understand this spends a small amount from the staging AI budget and produces
          advice only.
        </span>
      </label>
      <Button
        type="button"
        className="mt-4"
        disabled={!confirmed || selected.length < 1 || busy}
        onClick={run}
      >
        {busy
          ? "Comparing…"
          : `Compare ${selected.length || "selected"} product${selected.length === 1 ? "" : "s"}`}
      </Button>
      {message ? (
        <p className="mt-4 text-sm" role="status">
          {message}
        </p>
      ) : null}
      {result ? (
        <div className="border-border bg-surface mt-4 rounded-xl border p-4 text-sm">
          <p className="font-semibold">
            {result.summary.attempted_candidates} attempted ·{" "}
            {result.summary.continued_candidates} may continue ·{" "}
            {result.summary.human_exception_candidates} need attention ·{" "}
            {result.summary.failed_candidates} failed
          </p>
          <p className="text-muted mt-1">
            Estimated cost: ${Number(result.summary.estimated_total_cost_usd).toFixed(6)}{" "}
            · Run {result.runId.slice(0, 8)}
          </p>
          <div className="mt-3 grid gap-2">
            {result.outcomes.map((outcome) => (
              <p key={outcome.candidateId}>
                {outcome.candidateId.slice(0, 8)}:{" "}
                {outcome.identity ?? outcome.failureCode} /{" "}
                {outcome.ingredientAgreement ?? "no comparison"} /{" "}
                {outcome.confidence === null
                  ? "no confidence"
                  : `${Math.round(outcome.confidence * 100)}% confidence`}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
