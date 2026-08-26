import type { IngredientStatus } from "@snackcheck/contracts";
import { INGREDIENT_STATUS_LABELS } from "@snackcheck/contracts";
import { cn } from "@/lib/utils";

const styles: Record<IngredientStatus, string> = {
  PASS: "bg-pass-surface text-pass",
  FAIL: "bg-fail-surface text-fail",
  VERIFY: "bg-verify-surface text-verify",
};

export function StatusCard({
  status,
  summary,
}: {
  status: IngredientStatus;
  summary: string;
}) {
  return (
    <section className={cn("rounded-3xl p-6", styles[status])} aria-live="polite">
      <p className="text-sm font-semibold uppercase tracking-wide">{status}</p>
      <h2 className="mt-2 text-2xl font-semibold">{INGREDIENT_STATUS_LABELS[status]}</h2>
      <p className="mt-3 text-base">{summary}</p>
    </section>
  );
}
