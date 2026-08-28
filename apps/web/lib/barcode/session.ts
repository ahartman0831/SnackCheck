export const DECODE_TIMEOUT_MS = 20_000;
export const DUPLICATE_WINDOW_MS = 2_500;

export function rearCameraConstraints(deviceId?: string): MediaStreamConstraints {
  return {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: { ideal: "environment" } },
  };
}

export type CameraErrorCode =
  | "permission_denied"
  | "no_camera"
  | "insecure_context"
  | "unsupported"
  | "timeout"
  | "invalid_checksum"
  | "offline"
  | "lookup_failure"
  | "rate_limited"
  | "cancelled";

export type CameraPhase =
  "idle" | "requesting" | "streaming" | "looking_up" | "navigating";

export interface DuplicateGate {
  lastGtin14: string | null;
  lastAcceptedAt: number;
}

export function createDuplicateGate(): DuplicateGate {
  return { lastGtin14: null, lastAcceptedAt: 0 };
}

export function shouldAcceptDecode(
  gate: DuplicateGate,
  gtin14: string,
  now = Date.now(),
): boolean {
  if (gate.lastGtin14 === gtin14 && now - gate.lastAcceptedAt < DUPLICATE_WINDOW_MS) {
    return false;
  }
  gate.lastGtin14 = gtin14;
  gate.lastAcceptedAt = now;
  return true;
}

export function createLookupLock() {
  let inFlight: string | null = null;
  return {
    tryBegin(gtin14: string): boolean {
      if (inFlight) {
        return false;
      }
      inFlight = gtin14;
      return true;
    },
    end(gtin14: string): void {
      if (inFlight === gtin14) {
        inFlight = null;
      }
    },
    isBusy(): boolean {
      return inFlight !== null;
    },
  };
}

export function inspectCameraEnvironment(input?: {
  isSecureContext?: boolean;
  hasMediaDevices?: boolean;
  hasGetUserMedia?: boolean;
  online?: boolean;
}): CameraErrorCode | null {
  const isSecureContext = input?.isSecureContext ?? globalThis.isSecureContext;
  const mediaDevices =
    input?.hasMediaDevices ?? Boolean(globalThis.navigator?.mediaDevices);
  const hasGetUserMedia =
    input?.hasGetUserMedia ??
    typeof globalThis.navigator?.mediaDevices?.getUserMedia === "function";
  if (isSecureContext === false) {
    return "insecure_context";
  }
  if (!mediaDevices || !hasGetUserMedia) {
    return "unsupported";
  }
  return null;
}

export function mapGetUserMediaError(error: unknown): CameraErrorCode {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission_denied";
  }
  if (
    name === "NotFoundError" ||
    name === "OverconstrainedError" ||
    name === "DevicesNotFoundError"
  ) {
    return "no_camera";
  }
  if (name === "NotSupportedError" || name === "TypeError") {
    return "unsupported";
  }
  if (name === "SecurityError") {
    return "insecure_context";
  }
  return "unsupported";
}

export function releaseMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) {
    return;
  }
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function isMediaStream(value: unknown): value is MediaStream {
  return Boolean(
    value &&
    typeof value === "object" &&
    "getTracks" in value &&
    typeof (value as { getTracks?: unknown }).getTracks === "function",
  );
}

export function releaseVideoElement(video: HTMLVideoElement | null | undefined): void {
  if (!video) {
    return;
  }
  const stream = video.srcObject;
  if (isMediaStream(stream)) {
    releaseMediaStream(stream);
  }
  video.srcObject = null;
  video.removeAttribute("src");
}

export const CAMERA_ERROR_COPY: Record<CameraErrorCode, string> = {
  permission_denied:
    "Camera access was denied. You can still type the numbers printed below the barcode.",
  no_camera: "No camera is available on this device. Type the barcode numbers instead.",
  insecure_context:
    "Camera scanning needs a secure page (HTTPS). Type the barcode numbers instead.",
  unsupported: "This browser cannot open a camera. Type the barcode numbers instead.",
  timeout: "No barcode was read in time. You can try again or type the numbers.",
  invalid_checksum:
    "That barcode check digit is invalid. Try again or enter the numbers.",
  offline:
    "You are offline. Reconnect to look up a barcode, or type the numbers to keep them.",
  lookup_failure: "Lookup is unavailable. The numbers were kept so you can try again.",
  rate_limited: "Too many lookups. Wait a moment, or type the numbers instead.",
  cancelled: "Camera stopped. Manual entry is still available.",
};
