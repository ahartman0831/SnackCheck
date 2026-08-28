import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-surface-strong animate-pulse rounded-[14px]", className)}
      aria-hidden
    />
  );
}
