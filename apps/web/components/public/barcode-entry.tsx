"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { normalizeGtin } from "@/lib/gtin";

function groupDigits(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function BarcodeEntry() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("gtin") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => normalizeGtin(value.replace(/\s/g, "")), [value]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeGtin(value.replace(/\s/g, ""));
    if ("error" in normalized) {
      setError(normalized.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/upc/${encodeURIComponent(normalized.gtin14)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "That barcode could not be checked.");
        return;
      }
      const slug = payload.data?.lookup?.result?.slug;
      if (slug) {
        router.push(`/product/${slug}`);
        return;
      }
      router.push(`/scan/ingredients?gtin=${encodeURIComponent(normalized.gtin14)}`);
    } catch {
      setError("Lookup is unavailable. Your numbers were kept.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        id="manual-barcode"
        label="Barcode numbers"
        hint="Usually below the barcode on the front or back of the package. Spaces are optional."
        error={error ?? undefined}
      >
        <Input
          id="manual-barcode"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "manual-barcode-error" : "manual-barcode-hint"}
          value={groupDigits(value)}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (text) {
              event.preventDefault();
              setValue(text);
            }
          }}
          className="font-mono text-lg tracking-wide"
        />
      </Field>
      {"gtin14" in preview ? (
        <p className="text-muted font-mono text-sm">
          Normalized GTIN-14: {preview.gtin14}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Looking up…" : "Look up barcode"}
      </Button>
    </form>
  );
}
