"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BarcodeEntry() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/v1/upc/${encodeURIComponent(value)}`);
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "That barcode could not be checked.");
      return;
    }
    const slug = payload.data?.lookup?.result?.slug;
    if (slug) {
      router.push(`/product/${slug}`);
      return;
    }
    router.push(`/scan/ingredients?gtin=${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="manual-barcode" className="font-medium">
        Enter the barcode numbers
      </label>
      <input
        id="manual-barcode"
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="border-border bg-surface min-h-12 rounded-2xl border px-4"
      />
      <button
        type="submit"
        disabled={busy}
        className="bg-accent min-h-12 rounded-2xl font-semibold text-white"
      >
        {busy ? "Checking…" : "Look up barcode"}
      </button>
      {error ? <p className="text-fail">{error}</p> : null}
    </form>
  );
}
