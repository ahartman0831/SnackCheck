import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex touch-target items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-[background-color,border-color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-accent shadow-[var(--highlight),var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-[var(--highlight),var(--shadow)]",
        secondary:
          "border-border bg-surface/90 text-foreground border shadow-[var(--highlight)] hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface",
        ghost: "text-foreground hover:bg-surface-strong hover:text-accent",
        danger: "bg-fail text-white hover:opacity-90",
      },
      size: {
        md: "min-h-11",
        sm: "min-h-11 px-3 text-sm",
        lg: "min-h-14 px-6 text-base",
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
