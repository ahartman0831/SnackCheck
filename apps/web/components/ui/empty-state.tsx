import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
  headingLevel = "h2",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  return (
    <div
      className={cn(
        "border-border bg-surface flex flex-col items-start gap-3 rounded-[20px] border p-5",
        className,
      )}
    >
      <Heading className="text-lg font-semibold">{title}</Heading>
      <p className="text-muted text-sm">{description}</p>
      {action}
    </div>
  );
}
