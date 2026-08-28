"use client";

import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { BarcodeEntry } from "@/components/public/barcode-entry";

const LiveBarcodeCapture = dynamic(
  () => import("./live-barcode-capture").then((module) => module.LiveBarcodeCapture),
  { ssr: false },
);

export function BarcodeWorkspace({ cameraEnabled }: { cameraEnabled: boolean }) {
  const [keptNumbers, setKeptNumbers] = useState<string | undefined>();

  return (
    <div className="flex flex-col gap-6">
      {cameraEnabled ? (
        <LiveBarcodeCapture onKeepNumbers={setKeptNumbers} />
      ) : (
        <div data-future-capture-slot="reserved" />
      )}
      <Suspense>
        <BarcodeEntry key={keptNumbers ?? "manual"} prefill={keptNumbers} />
      </Suspense>
    </div>
  );
}
