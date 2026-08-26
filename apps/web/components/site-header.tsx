import Link from "next/link";

const links = [
  { href: "/search", label: "Search" },
  { href: "/approved", label: "Treats I can bring" },
  { href: "/rules/arizona", label: "Arizona rules" },
];

export function SiteHeader() {
  return (
    <header className="border-border bg-surface border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Can I Bring This?
        </Link>
        <nav aria-label="Primary">
          <ul className="text-muted flex items-center gap-4 text-sm font-medium">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
