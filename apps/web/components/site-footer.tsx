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
          ? "border-border bg-surface border-t"
          : "border-border bg-surface border-t pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
      }
    >
      <div className="text-muted mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 text-sm">
        <p>{LOCAL_RULES_DISCLAIMER}</p>
        <nav aria-label="Legal">
          <ul className="flex flex-wrap gap-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="touch-target inline-flex items-center underline underline-offset-2"
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
