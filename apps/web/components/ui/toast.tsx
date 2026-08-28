"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

export function Toaster() {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      toastOptions={{
        className: "border-border bg-surface text-foreground rounded-[16px]",
      }}
    />
  );
}
