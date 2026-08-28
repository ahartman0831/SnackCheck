"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, ScanLine, Search, ShoppingBag } from "lucide-react";
import { barcodeNavLabel } from "@/lib/public-copy";
import { hideAppChrome } from "@/lib/shell";
import { cn } from "@/lib/utils";

export function MobileTabBar() {
  const pathname = usePathname();
  if (hideAppChrome(pathname)) {
    return null;
  }

  const tabs = [
    { href: "/", label: "Home", icon: Home, match: (path: string) => path === "/" },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      match: (path: string) => path.startsWith("/search"),
    },
    {
      href: "/scan/barcode",
      label: barcodeNavLabel(),
      icon: ScanLine,
      match: (path: string) => path.startsWith("/scan"),
      prominent: true,
    },
    {
      href: "/approved",
      label: "Browse",
      icon: ShoppingBag,
      match: (path: string) => path.startsWith("/approved"),
    },
    {
      href: "/rules/arizona",
      label: "Rules",
      icon: BookOpen,
      match: (path: string) => path.startsWith("/rules"),
    },
  ];

  return (
    <nav
      aria-label="Mobile"
      className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-5 px-1 pt-1">
        {tabs.map((tab) => {
          const current = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex justify-center">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold",
                  current ? "text-accent" : "text-muted",
                  tab.prominent && "-mt-4",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-full",
                    tab.prominent && "bg-accent text-on-accent shadow-[var(--shadow)]",
                    !tab.prominent && current && "bg-surface-strong",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
