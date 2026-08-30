import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProductMergeControls } from "@/components/admin/product-merge-controls";
import { getAdminProduct } from "@/lib/admin/products";

export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success) notFound();
  const result = await getAdminProduct(id.data);
  if (result.kind === "not-found") notFound();
  if (result.kind === "unauthorized")
    return (
      <>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-muted mt-3">No product evidence was loaded.</p>
      </>
    );
  const product = result.record;
  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/admin/products" className="text-muted text-sm underline">
          ← Product queue
        </Link>
        <p className="text-muted mt-3 font-mono text-xs">{product.id}</p>
        <h1 className="mt-1 text-3xl font-semibold">
          {product.brand} {product.name}
        </h1>
        <p className="text-muted mt-2">
          {product.variant ?? "No variant"} · {product.size ?? "No size"} ·{" "}
          {product.category ?? "No category"}
        </p>
        <p className="mt-2 font-semibold">
          {product.active ? "ACTIVE" : "INACTIVE / MERGED"}
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-2">
        <article>
          <h2 className="text-xl font-semibold">Identifiers and aliases</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {product.identifiers.map((item) => (
              <li
                key={`${item.type}-${item.raw}`}
                className="border-border rounded-xl border p-3"
              >
                <strong>{item.type}</strong> · {item.raw}
                <br />
                <span className="text-muted font-mono">{item.gtin14}</span>
                {item.primary ? " · primary" : ""}
              </li>
            ))}
            {product.identifiers.length === 0 ? (
              <li className="text-muted">No identifiers.</li>
            ) : null}
          </ul>
          {product.aliases.length ? (
            <p className="text-muted mt-3 text-sm">
              Aliases: {product.aliases.map((item) => item.alias).join(", ")}
            </p>
          ) : null}
        </article>
        <article>
          <h2 className="text-xl font-semibold">Formulations</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {product.formulations.map((item) => (
              <li key={item.id} className="border-border rounded-xl border p-3">
                <strong>Version {item.version}</strong> · {item.status} ·{" "}
                {item.active ? "ACTIVE" : "inactive"}
                <br />
                <span className="text-muted">
                  Verified{" "}
                  {item.lastVerifiedAt
                    ? new Date(item.lastVerifiedAt).toLocaleString()
                    : "never"}
                </span>
              </li>
            ))}
            {product.formulations.length === 0 ? (
              <li className="text-muted">No formulations.</li>
            ) : null}
          </ul>
        </article>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Merge duplicate</h2>
        <p className="text-muted mt-2 text-sm">
          This keeps the selected canonical product, moves this record&apos;s evidence,
          and permanently redirects its old public URL. Open formulation conflicts or
          duplicate formulation hashes must be resolved first.
        </p>
        <div className="mt-3">
          <ProductMergeControls
            sourceId={product.id}
            sourceUpdatedAt={product.updatedAt}
            disabled={!product.active || product.conflict}
            candidates={product.candidates.map((item) => ({
              id: item.id,
              updatedAt: item.updatedAt,
              label: `${item.brand} ${item.name}${item.variant ? ` · ${item.variant}` : ""} · ${item.id.slice(0, 8)}`,
            }))}
          />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Product audit history</h2>
        <div className="mt-3 flex flex-col gap-2">
          {product.audit.map((item, index) => (
            <article
              key={`${item.createdAt}-${index}`}
              className="border-border rounded-xl border p-3"
            >
              <strong>{item.action.replaceAll("_", " ")}</strong>
              <p className="text-muted text-sm">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
        {product.audit.length === 0 ? (
          <p className="text-muted mt-3">No product actions recorded.</p>
        ) : null}
      </section>
    </div>
  );
}
