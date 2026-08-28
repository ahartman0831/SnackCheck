import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({
  className,
  title = "SnackCheck",
}: {
  className?: string;
  title?: string;
}) {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-8 shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="8" y1="6" x2="56" y2="58">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      <path
        d="M16 22V18h8M48 22V18h-8M16 42v4h8M48 42v4h-8"
        fill="none"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <rect x="22" y="24" width="20" height="16" rx="3" fill="white" opacity="0.92" />
      <path
        d="M26 32.2l4.1 4.1 8.2-8.6"
        fill="none"
        stroke="#4F46E5"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoMono({
  className,
  title = "SnackCheck",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-8 shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect
        width="60"
        height="60"
        x="2"
        y="2"
        rx="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M16 22V18h8M48 22V18h-8M16 42v4h8M48 42v4h-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M24 33.2l5.2 5.2 10.6-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <LogoMark className="size-8" />
      <span>SnackCheck</span>
    </span>
  );
}
