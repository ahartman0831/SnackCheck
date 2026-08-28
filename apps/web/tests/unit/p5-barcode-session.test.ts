import { describe, expect, it } from "vitest";
import {
  createDuplicateGate,
  createLookupLock,
  inspectCameraEnvironment,
  mapGetUserMediaError,
  releaseMediaStream,
  shouldAcceptDecode,
} from "../../lib/barcode/session";

describe("camera session helpers", () => {
  it("suppresses the same GTIN inside the duplicate window", () => {
    const gate = createDuplicateGate();
    expect(shouldAcceptDecode(gate, "00000000000000", 1_000)).toBe(true);
    expect(shouldAcceptDecode(gate, "00000000000000", 1_500)).toBe(false);
    expect(shouldAcceptDecode(gate, "00000000000017", 1_600)).toBe(true);
    expect(shouldAcceptDecode(gate, "00000000000000", 4_000)).toBe(true);
  });

  it("permits only one in-flight lookup", () => {
    const lock = createLookupLock();
    expect(lock.tryBegin("00000000000000")).toBe(true);
    expect(lock.tryBegin("00000000000017")).toBe(false);
    expect(lock.isBusy()).toBe(true);
    lock.end("00000000000000");
    expect(lock.isBusy()).toBe(false);
    expect(lock.tryBegin("00000000000017")).toBe(true);
  });

  it("maps getUserMedia failures to honest camera errors", () => {
    expect(mapGetUserMediaError({ name: "NotAllowedError" })).toBe("permission_denied");
    expect(mapGetUserMediaError({ name: "NotFoundError" })).toBe("no_camera");
    expect(mapGetUserMediaError({ name: "SecurityError" })).toBe("insecure_context");
    expect(mapGetUserMediaError({ name: "NotSupportedError" })).toBe("unsupported");
  });

  it("detects insecure and unsupported environments before requesting a camera", () => {
    expect(
      inspectCameraEnvironment({ isSecureContext: false, hasGetUserMedia: true }),
    ).toBe("insecure_context");
    expect(
      inspectCameraEnvironment({
        isSecureContext: true,
        hasMediaDevices: false,
        hasGetUserMedia: false,
      }),
    ).toBe("unsupported");
    expect(
      inspectCameraEnvironment({
        isSecureContext: true,
        hasMediaDevices: true,
        hasGetUserMedia: true,
      }),
    ).toBeNull();
  });

  it("stops every media track", () => {
    const stops: string[] = [];
    const stream = {
      getTracks: () => [{ stop: () => stops.push("a") }, { stop: () => stops.push("b") }],
    } as unknown as MediaStream;
    releaseMediaStream(stream);
    expect(stops).toEqual(["a", "b"]);
  });
});
