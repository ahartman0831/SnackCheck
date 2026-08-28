"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  barcodeAttemptEvent,
  barcodeFallbackEvent,
  barcodeInvalidEvent,
  barcodeLookupEvent,
  barcodePermissionEvent,
  barcodeTimeoutEvent,
  emitPublicEvent,
} from "@/lib/barcode/analytics";
import { confirmScanFeedback } from "@/lib/barcode/feedback";
import { lookupNormalizedGtin, routeForLookup } from "@/lib/barcode/lookup";
import {
  listVideoDevices,
  startBarcodeScan,
  type ScanControls,
  type VideoDeviceOption,
} from "@/lib/barcode/scan-adapter";
import { normalizeGtin } from "@/lib/gtin";
import {
  CAMERA_ERROR_COPY,
  DECODE_TIMEOUT_MS,
  createDuplicateGate,
  createLookupLock,
  inspectCameraEnvironment,
  mapGetUserMediaError,
  releaseVideoElement,
  shouldAcceptDecode,
  type CameraErrorCode,
  type CameraPhase,
} from "@/lib/barcode/session";
import { cn } from "@/lib/utils";

export interface LiveBarcodeCaptureProps {
  onKeepNumbers?: (digits: string) => void;
  startScan?: typeof startBarcodeScan;
  listDevices?: typeof listVideoDevices;
  lookup?: typeof lookupNormalizedGtin;
  emit?: typeof emitPublicEvent;
  decodeTimeoutMs?: number;
}

export function LiveBarcodeCapture({
  onKeepNumbers,
  startScan = startBarcodeScan,
  listDevices = listVideoDevices,
  lookup = lookupNormalizedGtin,
  emit = emitPublicEvent,
  decodeTimeoutMs = DECODE_TIMEOUT_MS,
}: LiveBarcodeCaptureProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScanControls | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const gateRef = useRef(createDuplicateGate());
  const lockRef = useRef(createLookupLock());
  const confirmRef = useRef(true);
  const cancelledRef = useRef(false);

  const [phase, setPhase] = useState<CameraPhase>("idle");
  const [error, setError] = useState<CameraErrorCode | null>(null);
  const [devices, setDevices] = useState<VideoDeviceOption[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [confirmScans, setConfirmScans] = useState(true);

  const clearDecodeTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearDecodeTimeout();
    controlsRef.current?.stop();
    controlsRef.current = null;
    releaseVideoElement(videoRef.current);
  }, [clearDecodeTimeout]);

  const finishWithError = useCallback(
    (code: CameraErrorCode, digits?: string) => {
      cancelledRef.current = true;
      stopCamera();
      setPhase("idle");
      setError(code);
      if (digits) {
        onKeepNumbers?.(digits);
      }
    },
    [onKeepNumbers, stopCamera],
  );

  const startSession = useCallback(
    async (nextDeviceId?: string) => {
      const environment = inspectCameraEnvironment();
      if (environment) {
        emit(barcodePermissionEvent(environment));
        finishWithError(environment);
        return;
      }

      cancelledRef.current = false;
      setError(null);
      setPhase("requesting");
      emit(barcodeAttemptEvent());

      try {
        const video = videoRef.current;
        if (!video) {
          finishWithError("unsupported");
          return;
        }
        const controls = await startScan({
          video,
          deviceId: nextDeviceId,
          onResult: (text) => {
            void handleDecodedText(text);
          },
        });
        if (cancelledRef.current) {
          controls.stop();
          releaseVideoElement(video);
          return;
        }
        controlsRef.current = controls;
        setPhase("streaming");
        const listed = await listDevices().catch(() => []);
        setDevices(listed);
        clearDecodeTimeout();
        timeoutRef.current = window.setTimeout(() => {
          emit(barcodeTimeoutEvent());
          finishWithError("timeout");
        }, decodeTimeoutMs);
      } catch (caught) {
        const code = mapGetUserMediaError(caught);
        emit(barcodePermissionEvent(code));
        finishWithError(code);
      }

      async function handleDecodedText(text: string) {
        if (cancelledRef.current || lockRef.current.isBusy()) {
          return;
        }
        const normalized = normalizeGtin(text.replace(/\s/g, ""));
        if ("error" in normalized) {
          emit(barcodeInvalidEvent());
          setError("invalid_checksum");
          return;
        }
        if (!shouldAcceptDecode(gateRef.current, normalized.gtin14)) {
          return;
        }
        if (!lockRef.current.tryBegin(normalized.gtin14)) {
          return;
        }
        clearDecodeTimeout();
        confirmScanFeedback(confirmRef.current);
        setPhase("looking_up");
        setError(null);
        const result = await lookup(normalized.gtin14, { online: navigator.onLine });
        emit(barcodeLookupEvent(result));
        lockRef.current.end(normalized.gtin14);
        if (result.status === "found" || result.status === "unknown") {
          const href = routeForLookup(result);
          if (!href) {
            finishWithError("lookup_failure", normalized.gtin14);
            return;
          }
          cancelledRef.current = true;
          stopCamera();
          setPhase("navigating");
          router.push(href);
          return;
        }
        if (result.status === "offline") {
          finishWithError("offline", normalized.gtin14);
          return;
        }
        if (result.status === "rate_limited") {
          finishWithError("rate_limited", normalized.gtin14);
          return;
        }
        finishWithError("lookup_failure", normalized.gtin14);
      }
    },
    [
      clearDecodeTimeout,
      decodeTimeoutMs,
      emit,
      finishWithError,
      listDevices,
      lookup,
      router,
      startScan,
      stopCamera,
    ],
  );

  useEffect(() => {
    confirmRef.current = confirmScans;
  }, [confirmScans]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        cancelledRef.current = true;
        stopCamera();
        setPhase("idle");
      }
    }
    function onPageHide() {
      cancelledRef.current = true;
      stopCamera();
      setPhase("idle");
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      cancelledRef.current = true;
      stopCamera();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [stopCamera]);

  async function onStart() {
    gateRef.current = createDuplicateGate();
    lockRef.current = createLookupLock();
    await startSession(deviceId);
  }

  function onCancel() {
    emit(barcodeFallbackEvent());
    finishWithError("cancelled");
  }

  async function onSwitchCamera() {
    if (devices.length < 2) {
      return;
    }
    const currentIndex = devices.findIndex((device) => device.deviceId === deviceId);
    const next = devices[(currentIndex + 1) % devices.length];
    setDeviceId(next?.deviceId);
    stopCamera();
    await startSession(next?.deviceId);
  }

  const active =
    phase === "requesting" || phase === "streaming" || phase === "looking_up";

  return (
    <section className="flex flex-col gap-3" aria-labelledby="barcode-camera-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="barcode-camera-heading" className="text-lg font-semibold">
            Use the camera
          </h2>
          <p className="text-muted text-sm">
            Camera access starts only after you tap the button. Microphone and location
            are never requested.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "border-border bg-surface relative overflow-hidden rounded-[20px] border",
          "aspect-[4/3] w-full",
        )}
      >
        <video
          ref={videoRef}
          className={cn(
            "h-full w-full object-cover",
            active ? "opacity-100" : "opacity-0",
            "motion-reduce:transition-none",
          )}
          muted
          playsInline
          autoPlay
          aria-hidden={!active}
        />
        {!active ? (
          <div className="text-muted absolute inset-0 flex items-center justify-center p-4 text-center text-sm">
            The camera preview stays off until you start it.
          </div>
        ) : null}
        {phase === "looking_up" ? (
          <p className="bg-foreground/70 text-on-accent absolute inset-x-0 bottom-0 p-3 text-center text-sm">
            Looking up barcode…
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-fail text-sm" role="alert">
          {CAMERA_ERROR_COPY[error]}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {active ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel camera
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void onStart()}
            disabled={phase === "navigating"}
          >
            Start camera
          </Button>
        )}
        {active && devices.length > 1 ? (
          <Button type="button" variant="secondary" onClick={() => void onSwitchCamera()}>
            Switch camera
          </Button>
        ) : null}
      </div>

      <label className="text-muted flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-accent h-4 w-4"
          checked={confirmScans}
          onChange={(event) => setConfirmScans(event.target.checked)}
        />
        Short vibration when a barcode is read, if this device supports it
      </label>
    </section>
  );
}
