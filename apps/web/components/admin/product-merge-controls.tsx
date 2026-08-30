"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProductMergeControls({
  sourceId,
  sourceUpdatedAt,
  candidates,
  disabled,
}: {
  sourceId: string;
  sourceUpdatedAt: string;
  candidates: Array<{ id: string; label: string; updatedAt: string }>;
  disabled: boolean;
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const target = candidates.find((item) => item.id === targetId);

  async function merge() {
    if (!target) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/products/${sourceId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetProductId: target.id,
          sourceUpdatedAt,
          targetUpdatedAt: target.updatedAt,
          confirmed: acknowledged,
          confirmation,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "The products were not merged.");
      setMessage(
        "The duplicate was merged, audited, and its old public link now redirects.",
      );
      router.push(`/admin/products/${target.id}`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The products were not merged.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-border rounded-2xl border p-4">
      <label className="text-sm font-semibold">
        Keep this canonical product
        <select
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          disabled={disabled}
          className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
        >
          <option value="">Choose an active product</option>
          {candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          disabled={disabled}
          className="mt-1 h-5 w-5"
        />
        <span>
          I compared both products and intend to move this product&apos;s identifiers,
          formulations, submissions, and old links to the selected canonical product.
        </span>
      </label>
      <label className="mt-4 block text-sm font-semibold">
        Type MERGE
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={disabled}
          className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
        />
      </label>
      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        disabled={
          disabled || !target || !acknowledged || confirmation !== "MERGE" || busy
        }
        onClick={merge}
      >
        {busy ? "Merging…" : "Merge this duplicate"}
      </Button>
      {message ? (
        <p role="status" className="text-muted mt-3 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
