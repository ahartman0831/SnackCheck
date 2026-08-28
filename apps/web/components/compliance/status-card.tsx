import { CircleAlert, CircleCheck, ScanSearch } from "lucide-react";
import type { IngredientStatus } from "@snackcheck/contracts";
import { INGREDIENT_STATUS_LABELS } from "@snackcheck/contracts";
import { cn } from "@/lib/utils";

const styles: Record<IngredientStatus, string> = {
  PASS: "bg-pass-surface text-pass",
  FAIL: "bg-fail-surface text-fail",
  VERIFY: "bg-verify-surface text-verify",
};

const ICONS = {
  PASS: CircleCheck,
  FAIL: CircleAlert,
  VERIFY: ScanSearch,
} as const;

export function StatusCard({
  status,
  summary,
}: {
  status: IngredientStatus;
  summary: string;
}) {
  const Icon = ICONS[status];
  return (
    <section className={cn("rounded-3xl p-6", styles[status])} aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
        <Icon className="size-5" aria-hidden />
        <span>{status}</span>
      </p>
      <h2 className="mt-2 text-2xl font-semibold">{INGREDIENT_STATUS_LABELS[status]}</h2>
      <p className="mt-3 text-base">{summary}</p>
    </section>
  );
}
