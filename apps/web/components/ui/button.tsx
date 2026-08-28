import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex touch-target items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-semibold transition-[background-color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-accent shadow-[var(--highlight)] hover:bg-accent-strong",
        secondary:
          "border-border bg-surface text-foreground border shadow-[var(--highlight)] hover:bg-surface-strong",
        ghost: "text-foreground hover:bg-surface-strong",
        danger: "bg-fail text-white hover:opacity-90",
      },
      size: {
        md: "min-h-11",
        sm: "min-h-11 px-3 text-sm",
        lg: "min-h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = "button", ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      ref={ref}
      {...props}
    />
  );
});

export { buttonVariants };
