"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/logo";
import { ThemeControl } from "@/components/shell/theme-control";
import { barcodeNavLabel } from "@/lib/public-copy";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const links = [
    { href: "/search", label: "Search" },
    { href: "/approved", label: "What I can bring" },
    { href: "/scan/barcode", label: barcodeNavLabel() },
    { href: "/rules/arizona", label: "Arizona rules" },
  ];

  return (
    <header className="border-border bg-surface/90 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="touch-target inline-flex items-center">
          <Wordmark className="text-base sm:text-lg" />
          <span className="sr-only">SnackCheck home</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          <ul className="flex items-center gap-1">
            {links.map((link) => {
              const current =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(`${link.href}`));
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "touch-target inline-flex items-center rounded-[14px] px-3 text-sm font-semibold",
                      current
                        ? "bg-surface-strong text-foreground"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ThemeControl />
        </nav>
        <div className="md:hidden">
          <ThemeControl />
        </div>
      </div>
    </header>
  );
}
