import type { Metadata } from "next";
import { ScanLine } from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="glass-panel rounded-[28px] px-5 py-7 sm:px-8">
        <span className="bg-spark-soft text-spark flex size-12 items-center justify-center rounded-[18px]">
          <ScanLine className="size-6" aria-hidden />
        </span>
        <p className="eyebrow mt-5">Fast package check</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          {cameraEnabled ? barcodePageTitle() : title}
        </h1>
        <p className="text-muted mt-3 text-lg">{barcodePageDescription()}</p>
      </header>
      <div className="glass-panel rounded-[28px] p-5 sm:p-7">
        <BarcodeWorkspace cameraEnabled={cameraEnabled} />
      </div>
    </div>
  );
}
