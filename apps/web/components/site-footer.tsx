"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCAL_RULES_DISCLAIMER } from "@/lib/copy";
import { hideAppChrome } from "@/lib/shell";

const links = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclosure", label: "Disclosure" },
  { href: "/support", label: "Support" },
  { href: "/rules/arizona", label: "Arizona sources" },
];

export function SiteFooter() {
  const pathname = usePathname();
  const compact = hideAppChrome(pathname);

  return (
    <footer
      className={
        compact
          ? "border-border/70 bg-surface/70 border-t backdrop-blur"
          : "border-border/70 bg-surface/70 border-t pb-[calc(5.5rem+env(safe-area-inset-bottom))] backdrop-blur md:pb-0"
      }
    >
      <div className="text-muted mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-10 text-sm sm:px-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <p className="text-foreground text-base font-bold">SnackCheck</p>
          <p className="max-w-2xl">{LOCAL_RULES_DISCLAIMER}</p>
        </div>
        <nav aria-label="Legal">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="touch-target hover:text-accent inline-flex items-center font-semibold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
