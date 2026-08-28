"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { useId } from "react";

export function Progress({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span id={labelId}>{label}</span>
        <span className="tabular font-mono">{clamped}%</span>
      </div>
      <ProgressPrimitive.Root
        value={clamped}
        aria-labelledby={labelId}
        aria-label={label}
        title={label}
        className="bg-surface-strong h-3 overflow-hidden rounded-full"
      >
        <ProgressPrimitive.Indicator
          className="bg-accent h-full"
          style={{ width: `${clamped}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}
