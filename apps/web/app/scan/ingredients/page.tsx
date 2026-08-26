import { IngredientConfirmForm } from "@/components/upload/ingredient-confirm-form";

export default function IngredientScanPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">Scan ingredients</h1>
      <p className="text-muted">
        Here&apos;s what we read. Check it against your package. No PASS is shown until
        you confirm the text. Image extraction is rate-limited; you can paste the panel if
        scanning is unavailable.
      </p>
      <IngredientConfirmForm />
    </div>
  );
}
