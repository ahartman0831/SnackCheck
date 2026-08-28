import type { Metadata } from "next";
import { Suspense } from "react";
import { IngredientCheckForm } from "@/components/public/ingredient-check-form";
import { isIngredientPhotoEnabled } from "@/lib/features";
import { ingredientPageTitle } from "@/lib/public-copy";
import { pageMetadata } from "@/lib/seo";

const photo = isIngredientPhotoEnabled();
const title = "Check an ingredient list";

export const metadata: Metadata = pageMetadata({
  title: ingredientPageTitle(),
  path: "/scan/ingredients",
  description: "Paste a packaged-food ingredient list for a deterministic Arizona check.",
});

export default function IngredientScanPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-muted">
        {photo
          ? "Photograph the ingredient panel, then confirm the text before SnackCheck evaluates it."
          : "Paste or type the ingredient list from the package. No photo is processed on this page."}
      </p>
      <div data-ingredient-capture-slot={photo ? "ready" : "reserved"} />
      <Suspense>
        <IngredientCheckForm />
      </Suspense>
    </div>
  );
}
