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
        Ingredient-photo processing is not active in production. In an explicitly enabled
        test environment, SnackCheck removes image metadata, stores only a private
        sanitized derivative for the stated retention period, and asks you to confirm the
        extracted ingredient text before evaluation.
      </p>
      <p>
        Analytics, when enabled, use allowlisted event names and a daily rotating
        anonymous key. Raw IP addresses are not stored.
      </p>
      <p>
        Operational monitoring receives only allowlisted technical fields such as a
        request ID, route template, safe error code, environment, and release. It does not
        receive ingredient text, images, submission tokens, raw error messages, headers,
        query strings, or account details.
      </p>
    </article>
  );
}
