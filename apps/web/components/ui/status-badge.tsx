import { CircleAlert, CircleCheck, ScanSearch } from "lucide-react";
import type { IngredientStatus } from "@snackcheck/contracts";
import { INGREDIENT_STATUS_LABELS } from "@snackcheck/contracts";
import { cn } from "@/lib/utils";

const ICONS = {
  PASS: CircleCheck,
  FAIL: CircleAlert,
  VERIFY: ScanSearch,
} as const;

const STYLES: Record<IngredientStatus, string> = {
  PASS: "bg-pass-surface text-pass",
  FAIL: "bg-fail-surface text-fail",
  VERIFY: "bg-verify-surface text-verify",
};

export function StatusBadge({ status }: { status: IngredientStatus }) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        STYLES[status],
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span>{INGREDIENT_STATUS_LABELS[status]}</span>
    </span>
  );
}
