import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Support",
  path: "/support",
  description: "How to report a SnackCheck problem or a package that looks different.",
});

export default function SupportPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">Support</h1>
      <p>
        If a package looks different from the stored formulation, paste the new ingredient
        list. Do not invent a product record.
      </p>
      <p>
        <Link
          href="/scan/ingredients"
          className="font-semibold underline underline-offset-4"
        >
          Check an ingredient list
        </Link>
      </p>
      <p className="text-muted">
        Payment and retailer support are not available. There is no active checkout.
      </p>
    </article>
  );
}
