"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type PromotionDefaults = {
  brand: string;
  name: string;
  variant: string;
  size: string;
  category: string;
  verifiedIngredientText: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

export function CatalogCandidateControls({
  candidateId,
  expectedUpdatedAt,
  state,
  defaults,
}: {
  candidateId: string;
  expectedUpdatedAt: string;
  state: string;
  defaults: PromotionDefaults;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState({
    ...defaults,
    slug: slugify(`${defaults.brand}-${defaults.name}-${defaults.variant}`),
    individuallyPackaged: false,
    evidenceUrl: "",
    evidenceTitle: "",
    observedAt: new Date().toISOString().slice(0, 10),
  });

  async function post(path: string, body: object, action: string) {
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
        throw new Error(payload.error?.message ?? "The decision was not saved.");
      setMessage("The decision and audit entry were recorded.");
      setConfirmed(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The decision was not saved.");
    } finally {
      setBusy(null);
    }
  }

  if (["PROMOTED", "REJECTED", "SUPERSEDED"].includes(state))
    return (
      <p className="text-muted text-sm">
        This candidate is closed and cannot be changed.
      </p>
    );

  return (
    <div className="border-border rounded-2xl border p-4">
      {state !== "REVIEW_QUEUED" ? (
        <div>
          <label className="text-sm font-semibold">
            Reviewer note
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="border-border bg-surface mt-1 block min-h-24 w-full rounded-xl border p-3"
              placeholder="Required when rejecting"
            />
          </label>
          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span>I reviewed the source, screening result, and quality flags.</span>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!confirmed || busy !== null}
              onClick={() =>
                post(
                  `/api/admin/catalog-candidates/${candidateId}/review`,
                  { decision: "QUEUE", reason, expectedUpdatedAt, confirmed },
                  "queue",
                )
              }
            >
              {busy === "queue" ? "Saving…" : "Queue for promotion review"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!confirmed || reason.trim().length < 8 || busy !== null}
              onClick={() =>
                post(
                  `/api/admin/catalog-candidates/${candidateId}/review`,
                  { decision: "REJECT", reason, expectedUpdatedAt, confirmed },
                  "reject",
                )
              }
            >
              {busy === "reject" ? "Saving…" : "Reject candidate"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-semibold">Promote with verified manufacturer evidence</p>
          <p className="text-muted mt-1 text-sm">
            The external dataset is only a lead. Compare every ingredient below with an
            official manufacturer page before promoting.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["brand", "name", "variant", "size", "category", "slug"] as const).map(
              (field) => (
                <label key={field} className="text-sm font-semibold capitalize">
                  {field}
                  <input
                    value={String(form[field])}
                    onChange={(event) =>
                      setForm({ ...form, [field]: event.target.value })
                    }
                    className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
                  />
                </label>
              ),
            )}
          </div>
          <label className="mt-3 block text-sm font-semibold">
            Confirmed ingredient text
            <textarea
              value={form.verifiedIngredientText}
              onChange={(event) =>
                setForm({ ...form, verifiedIngredientText: event.target.value })
              }
              className="border-border bg-surface mt-1 block min-h-40 w-full rounded-xl border p-3"
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Manufacturer evidence URL
              <input
                type="url"
                value={form.evidenceUrl}
                onChange={(event) =>
                  setForm({ ...form, evidenceUrl: event.target.value })
                }
                placeholder="https://manufacturer.example/product"
                className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold">
              Evidence title
              <input
                value={form.evidenceTitle}
                onChange={(event) =>
                  setForm({ ...form, evidenceTitle: event.target.value })
                }
                className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold">
              Observed date
              <input
                type="date"
                value={form.observedAt}
                onChange={(event) => setForm({ ...form, observedAt: event.target.value })}
                className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="flex items-end gap-3 pb-2">
              <input
                type="checkbox"
                checked={form.individuallyPackaged}
                onChange={(event) =>
                  setForm({ ...form, individuallyPackaged: event.target.checked })
                }
                className="h-5 w-5"
              />
              Individually packaged
            </label>
          </div>
          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span>
              I compared every ingredient with the linked manufacturer evidence. I
              understand promotion can make this product searchable after all publication
              rules pass.
            </span>
          </label>
          <Button
            className="mt-4"
            type="button"
            disabled={
              !confirmed ||
              busy !== null ||
              !form.evidenceUrl ||
              !form.evidenceTitle ||
              !form.verifiedIngredientText
            }
            onClick={() =>
              post(
                `/api/admin/catalog-candidates/${candidateId}/promote`,
                {
                  ...form,
                  observedAt: `${form.observedAt}T00:00:00.000Z`,
                  expectedUpdatedAt,
                  confirmed,
                },
                "promote",
              )
            }
          >
            {busy === "promote" ? "Promoting…" : "Promote verified product"}
          </Button>
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
