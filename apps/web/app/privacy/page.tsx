import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  path: "/privacy",
  description: "How SnackCheck handles public checks, analytics, and submissions.",
});

export default function PrivacyPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">Privacy</h1>
      <p>
        Parents do not need an account. The public application does not collect precise
        location.
      </p>
      <p>
        Ingredient-photo processing is not active. If you paste an ingredient list,
        SnackCheck uses that text. EXIF stripping is not implemented yet and is not
        claimed here.
      </p>
      <p>
        Analytics, when enabled, use allowlisted event names and a daily rotating
        anonymous key. Raw IP addresses are not stored.
      </p>
    </article>
  );
}
