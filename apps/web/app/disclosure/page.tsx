import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Disclosure",
  path: "/disclosure",
  description: "Independence and future affiliate policy for SnackCheck.",
});

export default function DisclosurePage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">Disclosure</h1>
      <p>
        Affiliate and retailer relationships are not active. SnackCheck does not currently
        display buy buttons, prices, or paid placements.
      </p>
      <p>
        If those features ship later, they will not change PASS, FAIL, or VERIFY, search
        ranking, or approved-list inclusion. This page does not imply tax deductibility.
      </p>
    </article>
  );
}
