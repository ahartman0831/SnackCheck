"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { IconButton } from "@/components/ui/icon-button";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "system", label: "Use system theme", icon: Monitor },
  { value: "light", label: "Use light theme", icon: Sun },
  { value: "dark", label: "Use dark theme", icon: Moon },
];

export function ThemeControl() {
  const { preference, setPreference } = useTheme();
  const current = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[0];
  const next =
    OPTIONS[
      (OPTIONS.findIndex((option) => option.value === preference) + 1) % OPTIONS.length
    ] ?? OPTIONS[0];
  const Icon = current.icon;

  return (
    <IconButton
      label={`${current.label}. Activate to ${next.label.toLowerCase()}.`}
      onClick={() => setPreference(next.value)}
    >
      <Icon className="size-5" aria-hidden />
    </IconButton>
  );
}
