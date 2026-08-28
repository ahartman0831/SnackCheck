import type { Metadata } from "next";
import { OfflineState } from "@/components/public/page-states";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Offline",
  path: "/offline",
  index: false,
  description:
    "SnackCheck needs a connection to check a package against the published ruleset.",
});

export default function OfflinePage() {
  return <OfflineState />;
}
