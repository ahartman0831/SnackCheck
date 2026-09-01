import type { Metadata } from "next";
import Link from "next/link";
import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const REVIEW_NAVIGATION = [
  ["/admin", "Dashboard"],
  ["/admin/submissions", "Submissions"],
  ["/admin/products", "Products"],
  ["/admin/formulations", "Formulations"],
  ["/admin/catalog", "Catalog candidates"],
  ["/admin/analytics", "Health & spend"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin();
  const navigation = auth.allowed
    ? [
        ...REVIEW_NAVIGATION,
        ...(auth.role === "REGULATORY_ADMIN" || auth.role === "SUPER_ADMIN"
          ? ([["/admin/rules", "Rules"]] as const)
          : []),
      ]
    : [];

  return (
    <div className="border-border bg-surface rounded-3xl border p-4 sm:p-6">
      <div className="border-border mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
        <p className="text-muted mr-auto text-sm font-semibold uppercase tracking-wide">
          SnackCheck operations
        </p>
        {navigation.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="border-border hover:bg-elevated rounded-full border px-3 py-2 text-sm font-semibold"
          >
            {label}
          </Link>
        ))}
        {!auth.allowed ? (
          <Link
            href="/admin/login"
            className="bg-accent text-on-accent rounded-full px-4 py-2 text-sm font-semibold"
          >
            Reviewer sign-in
          </Link>
        ) : (
          <AdminSignOutButton />
        )}
      </div>
      <main>{children}</main>
    </div>
  );
}
