import { Clock } from "lucide-react";
import type { FreshnessState } from "@snackcheck/contracts";
import { cn } from "@/lib/utils";

const COPY: Record<FreshnessState, string> = {
  CURRENT: "Current evidence",
  AGING: "Aging evidence",
  STALE: "Stale evidence",
  UNKNOWN: "Unknown freshness",
};

export function FreshnessBadge({ state }: { state: FreshnessState }) {
  return (
    <span
      className={cn(
        "text-muted inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
        "bg-surface-strong",
      )}
    >
      <Clock className="size-3.5" aria-hidden />
      <span className="tabular font-mono">{state}</span>
      <span className="sr-only">{COPY[state]}</span>
    </span>
  );
}
