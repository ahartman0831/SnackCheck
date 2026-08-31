"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { hideAppChrome } from "@/lib/shell";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const chromeHidden = hideAppChrome(pathname);

  return (
    <div className="app-backdrop flex min-h-full flex-col">
      {chromeHidden ? null : <SiteHeader />}
      <main
        className={cn(
          "mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10",
          !chromeHidden && "pb-28 md:pb-12",
        )}
      >
        {children}
      </main>
      {chromeHidden ? null : <SiteFooter />}
      <MobileTabBar />
    </div>
  );
}
