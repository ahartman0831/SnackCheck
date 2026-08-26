import Link from "next/link";
import { LOCAL_RULES_DISCLAIMER } from "@/lib/copy";

export function SiteFooter() {
  return (
    <footer className="border-border bg-surface mt-auto border-t">
      <div className="text-muted mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 text-sm">
        <p>{LOCAL_RULES_DISCLAIMER}</p>
        <nav aria-label="Legal">
          <ul className="flex flex-wrap gap-4">
            <li>
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="underline underline-offset-2">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/rules/arizona" className="underline underline-offset-2">
                Arizona sources
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
