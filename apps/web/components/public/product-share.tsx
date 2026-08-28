"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProductShare({
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <Button type="button" variant="secondary" onClick={() => void share()}>
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
