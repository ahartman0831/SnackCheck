import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-fail text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-border bg-surface/95 touch-target hover:border-accent/30 focus:border-accent w-full min-w-0 rounded-[18px] border px-4 font-sans shadow-[var(--highlight)] transition-[border-color,box-shadow] focus:shadow-[0_0_0_4px_var(--accent-soft)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-border bg-surface/95 hover:border-accent/30 focus:border-accent min-h-32 w-full min-w-0 rounded-[20px] border px-4 py-4 font-sans shadow-[var(--highlight)] transition-[border-color,box-shadow] focus:shadow-[0_0_0_4px_var(--accent-soft)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
