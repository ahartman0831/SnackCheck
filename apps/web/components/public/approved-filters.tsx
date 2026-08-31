"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { categoryLabel, discoveryHref } from "@/lib/products/discovery";

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
    packaged?: string;
  };
}) {
  const active = Object.values(values).filter(Boolean);

  const fields = (
    <div className="grid gap-3 sm:grid-cols-3">
      {values.category ? (
        <input type="hidden" name="category" value={values.category} />
      ) : null}
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
        Package format
        <select
          name="packaged"
          defaultValue={values.packaged ?? ""}
          className="border-border bg-surface mt-1 min-h-11 w-full rounded-[16px] border px-3"
        >
          <option value="">Any format</option>
          <option value="yes">Individually packaged</option>
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
            <Link href={discoveryHref({ category })}>{categoryLabel(category)}</Link>
          </Button>
        ))}
      </fieldset>

      <form className="hidden flex-col gap-3 md:flex" action="/approved" method="get">
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
          <form className="flex flex-col gap-3" action="/approved" method="get">
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
