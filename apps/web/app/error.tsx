"use client";

import { ServerErrorState } from "@/components/public/page-states";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ServerErrorState onRetry={reset} />;
}
