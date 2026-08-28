import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  path: "/terms",
  description: "Terms for using the SnackCheck Arizona ingredient check.",
});

export default function TermsPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">Terms</h1>
      <p>
        SnackCheck reports a deterministic Arizona ingredient check against a versioned
        ruleset and a versioned formulation. It does not provide legal advice and does not
        guarantee that a school will accept a food.
      </p>
      <p>
        Passing the ingredient check is not an allergy determination, a nutrition grade,
        or an Arizona endorsement.
      </p>
    </article>
  );
}
