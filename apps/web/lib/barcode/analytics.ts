import type { AnalyticsEvent } from "@snackcheck/contracts";
import type { BarcodeLookupResult } from "./lookup";
import type { CameraErrorCode } from "./session";

export function barcodeAttemptEvent(): AnalyticsEvent {
  return { name: "barcode_scan_started", properties: { category: "camera" } };
}

export function barcodePermissionEvent(outcome: CameraErrorCode): AnalyticsEvent {
  return {
    name: "barcode_scan_failed",
    properties: { category: "permission", failureCode: outcome },
  };
}

export function barcodeInvalidEvent(): AnalyticsEvent {
  return {
    name: "barcode_scan_failed",
    properties: { failureCode: "invalid_checksum" },
  };
}

export function barcodeLookupEvent(result: BarcodeLookupResult): AnalyticsEvent {
  if (result.status === "found") {
    return { name: "barcode_scan_succeeded", properties: { category: "known" } };
  }
  if (result.status === "unknown") {
    return { name: "barcode_unknown", properties: { category: "unknown" } };
  }
  return {
    name: "barcode_scan_failed",
    properties: { failureCode: result.status },
  };
}

export function barcodeTimeoutEvent(): AnalyticsEvent {
  return { name: "barcode_scan_failed", properties: { failureCode: "timeout" } };
}

export function barcodeFallbackEvent(): AnalyticsEvent {
  return { name: "barcode_scan_fallback", properties: { category: "manual" } };
}

export function emitPublicEvent(event: AnalyticsEvent): void {
  if (typeof fetch === "undefined") {
    return;
  }
  void fetch("/api/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {
    // Analytics must never block a lookup or navigation.
  });
}
