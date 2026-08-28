import type { Metadata } from "next";
import { BarcodeWorkspace } from "@/components/public/barcode-workspace";
import {
  barcodePageDescription,
  barcodePageTitle,
  barcodeUsesCamera,
} from "@/lib/public-copy";
import { pageMetadata } from "@/lib/seo";

const title = "Enter a barcode";

export const metadata: Metadata = pageMetadata({
  title: barcodePageTitle(),
  path: "/scan/barcode",
  description: barcodePageDescription(),
});

export default function BarcodeScanPage() {
  const cameraEnabled = barcodeUsesCamera();
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <h1 className="text-3xl font-semibold">
        {cameraEnabled ? barcodePageTitle() : title}
      </h1>
      <p className="text-muted">{barcodePageDescription()}</p>
      <BarcodeWorkspace cameraEnabled={cameraEnabled} />
    </div>
  );
}
