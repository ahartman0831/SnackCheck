import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function IconButton({
  className,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "border-border bg-surface text-foreground hover:bg-surface-strong inline-flex size-11 items-center justify-center rounded-[16px] border shadow-[var(--highlight)]",
        className,
      )}
      {...props}
    />
  );
}
