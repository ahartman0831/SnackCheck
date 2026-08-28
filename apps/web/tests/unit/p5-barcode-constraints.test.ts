import { describe, expect, it } from "vitest";
import { rearCameraConstraints } from "../../lib/barcode/session";

describe("camera constraints", () => {
  it("never requests microphone or geolocation and prefers the rear camera", () => {
    expect(rearCameraConstraints()).toEqual({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    expect(rearCameraConstraints("abc")).toEqual({
      audio: false,
      video: { deviceId: { exact: "abc" } },
    });
  });
});
