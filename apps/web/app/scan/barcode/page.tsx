import type { Metadata } from "next";
import { Suspense } from "react";
import { BarcodeEntry } from "@/components/public/barcode-entry";
import { barcodePageTitle } from "@/lib/public-copy";
import { pageMetadata } from "@/lib/seo";

const title = "Enter a barcode";

export const metadata: Metadata = pageMetadata({
  title: barcodePageTitle(),
  path: "/scan/barcode",
  description: "Enter the numbers printed below a packaged-food barcode.",
});

export default function BarcodeScanPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-muted">
        Type or paste the numbers printed below the barcode on the package.
      </p>
      <div data-future-capture-slot="reserved" />
      <Suspense>
        <BarcodeEntry />
      </Suspense>
    </div>
  );
}
