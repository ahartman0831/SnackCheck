import { BarcodeEntry } from "@/components/scanner/barcode-scanner";

export default function BarcodeScanPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">Scan a barcode</h1>
      <p className="text-muted">
        Camera scanning uses the browser on this page only. If the camera is
        denied, enter the numbers here.
      </p>
      <BarcodeEntry />
    </div>
  );
}
