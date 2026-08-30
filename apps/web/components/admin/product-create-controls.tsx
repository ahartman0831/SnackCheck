"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function slugify(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function ProductCreateControls({
  submissionId,
  expectedUpdatedAt,
  gtin14,
}: {
  submissionId: string;
  expectedUpdatedAt: string;
  gtin14: string;
}) {
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [variant, setVariant] = useState("");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("");
  const [slug, setSlug] = useState("");
  const [packaged, setPackaged] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function create() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/products/from-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          expectedUpdatedAt,
          brand,
          name,
          variant,
          size,
          category,
          slug,
          individuallyPackaged: packaged,
          confirmed,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "The product was not created.");
      router.push(`/admin/products/${body.data.productId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The product was not created.");
    } finally {
      setBusy(false);
    }
  }

  const ready = brand.trim() && name.trim() && slug.trim() && confirmed;
  return (
    <div className="border-border rounded-2xl border p-4">
      <p className="text-muted text-sm">Barcode {gtin14}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Brand
          <input
            value={brand}
            onChange={(event) => {
              setBrand(event.target.value);
              if (!slug) setSlug(slugify(`${event.target.value} ${name}`));
            }}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          Product name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSlug(slugify(`${brand} ${event.target.value} ${gtin14.slice(-6)}`));
            }}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          Variant
          <input
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          Size
          <input
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          Category
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          Public URL slug
          <input
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            className="border-border bg-surface mt-1 block w-full rounded-xl border px-3 py-2"
          />
        </label>
      </div>
      <label className="mt-4 flex gap-3">
        <input
          type="checkbox"
          checked={packaged}
          onChange={(event) => setPackaged(event.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span>Individually packaged</span>
      </label>
      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span>
          I verified the product identity and ingredient text against the retained package
          image. Create a package-verified product and audit this decision.
        </span>
      </label>
      <Button type="button" className="mt-4" disabled={!ready || busy} onClick={create}>
        {busy ? "Creating…" : "Create product from evidence"}
      </Button>
      {message ? (
        <p role="status" className="text-muted mt-3 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
