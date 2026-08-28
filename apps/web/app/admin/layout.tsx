import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface rounded-3xl border p-6">
      <p className="text-muted text-sm font-semibold uppercase tracking-wide">Admin</p>
      {children}
    </div>
  );
}
