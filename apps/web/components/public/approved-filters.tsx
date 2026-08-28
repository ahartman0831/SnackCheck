"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function ApprovedFilters({
  categories,
  brands,
  values,
}: {
  categories: string[];
  brands: string[];
  values: {
    category?: string;
    brand?: string;
    freshness?: string;
    verification?: string;
  };
}) {
  const router = useRouter();
  const active = Object.values(values).filter(Boolean);

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const key of ["brand", "freshness", "verification"] as const) {
      const value = String(data.get(key) ?? "");
      if (value) params.set(key, value);
    }
    const next = params.toString();
    router.push(next ? `/approved?${next}` : "/approved");
  }

  const fields = (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm font-semibold">
        Brand
        <select
          name="brand"
          defaultValue={values.brand ?? ""}
          className="border-border bg-surface mt-1 min-h-11 w-full rounded-[16px] border px-3"
        >
          <option value="">Any brand</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Freshness
        <select
          name="freshness"
          defaultValue={values.freshness ?? ""}
          className="border-border bg-surface mt-1 min-h-11 w-full rounded-[16px] border px-3"
        >
          <option value="">Any freshness</option>
          <option value="CURRENT">CURRENT</option>
        </select>
      </label>
      <label className="text-sm font-semibold">
        Verification
        <select
          name="verification"
          defaultValue={values.verification ?? ""}
          className="border-border bg-surface mt-1 min-h-11 w-full rounded-[16px] border px-3"
        >
          <option value="">Any confirmed tier</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="PACKAGE_VERIFIED">PACKAGE_VERIFIED</option>
        </select>
      </label>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Category</legend>
        {categories.map((category) => (
          <Button
            key={category}
            asChild
            variant={values.category === category ? "primary" : "secondary"}
          >
            <Link href={`/approved/${category}`}>{category}</Link>
          </Button>
        ))}
      </fieldset>

      <form
        className="hidden flex-col gap-3 md:flex"
        onSubmit={(event) => {
          event.preventDefault();
          apply(event.currentTarget);
        }}
      >
        {fields}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
          {active.length > 0 ? (
            <Button asChild variant="ghost">
              <Link href="/approved">Clear all</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="md:hidden">
        <Dialog
          trigger={<Button variant="secondary">Filters</Button>}
          title="Filter passing products"
          description="These filters only use fields from the published approved projection."
        >
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              apply(event.currentTarget);
            }}
          >
            {fields}
            <Button type="submit">Apply filters</Button>
          </form>
        </Dialog>
        {active.length > 0 ? (
          <Button asChild variant="ghost" className="mt-2">
            <Link href="/approved">Clear all</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
