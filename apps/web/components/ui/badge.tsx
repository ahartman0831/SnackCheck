import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold tracking-wide uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-surface-strong text-muted",
        accent: "bg-surface-strong text-accent",
        pass: "bg-pass-surface text-pass",
        fail: "bg-fail-surface text-fail",
        verify: "bg-verify-surface text-verify",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
