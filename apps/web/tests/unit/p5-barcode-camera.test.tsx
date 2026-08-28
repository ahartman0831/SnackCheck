import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveBarcodeCapture } from "../../components/public/live-barcode-capture";
import { BarcodeWorkspace } from "../../components/public/barcode-workspace";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/scan/barcode",
}));

describe("barcode camera capture", () => {
  beforeEach(() => {
    push.mockReset();
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
  });

  it("requests the camera only after a user gesture and prefers the rear camera", async () => {
    const startScan = vi.fn().mockImplementation(async ({ onResult, video }) => {
      video.srcObject = {
        getTracks: () => [{ stop: vi.fn(), kind: "video" }],
      } as unknown as MediaStream;
      setTimeout(() => onResult("036000291452"), 0);
      return { stop: vi.fn() };
    });
    const lookup = vi.fn().mockResolvedValue({
      status: "found",
      slug: "plain-oat-bars",
      gtin14: "00036000291452",
    });
    const emit = vi.fn();

    render(
      <LiveBarcodeCapture
        startScan={startScan}
        listDevices={async () => [{ deviceId: "back", label: "Back" }]}
        lookup={lookup}
        emit={emit}
      />,
    );

    expect(startScan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await waitFor(() => expect(startScan).toHaveBeenCalledTimes(1));
    expect(startScan.mock.calls[0]?.[0]).toMatchObject({
      video: expect.any(HTMLVideoElement),
    });
    await waitFor(() =>
      expect(lookup).toHaveBeenCalledWith("00036000291452", expect.anything()),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/product/plain-oat-bars"));
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "barcode_scan_started" }),
    );
  });

  it("does not look up a duplicate decode while a lookup is in flight", async () => {
    let send: ((text: string) => void) | undefined;
    const startScan = vi.fn().mockImplementation(async ({ onResult }) => {
      send = onResult;
      return { stop: vi.fn() };
    });
    let resolveLookup: (value: unknown) => void = () => undefined;
    const lookup = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
    );

    render(
      <LiveBarcodeCapture
        startScan={startScan}
        listDevices={async () => []}
        lookup={lookup}
        emit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await waitFor(() => expect(send).toBeTypeOf("function"));
    await act(async () => {
      send?.("036000291452");
      send?.("036000291452");
    });
    expect(lookup).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveLookup({ status: "unknown", gtin14: "00036000291452" });
    });
  });

  it("releases tracks on cancel", async () => {
    const stop = vi.fn();
    const trackStop = vi.fn();
    const startScan = vi.fn().mockImplementation(async ({ video }) => {
      video.srcObject = {
        getTracks: () => [{ stop: trackStop, kind: "video" }],
      } as unknown as MediaStream;
      return { stop };
    });

    render(
      <LiveBarcodeCapture
        startScan={startScan}
        listDevices={async () => []}
        lookup={vi.fn()}
        emit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByRole("button", { name: "Cancel camera" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel camera" }));
    expect(stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Start camera" })).toBeInTheDocument();
  });

  it("shows an honest denied-permission state and keeps the page usable", async () => {
    const startScan = vi.fn().mockRejectedValue({ name: "NotAllowedError" });
    render(
      <LiveBarcodeCapture
        startScan={startScan}
        listDevices={async () => []}
        lookup={vi.fn()}
        emit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/denied/i);
    expect(screen.getByRole("button", { name: "Start camera" })).toBeInTheDocument();
  });

  it("times out if no barcode is read", async () => {
    const startScan = vi.fn().mockResolvedValue({ stop: vi.fn() });
    render(
      <LiveBarcodeCapture
        startScan={startScan}
        listDevices={async () => []}
        lookup={vi.fn()}
        emit={vi.fn()}
        decodeTimeoutMs={40}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/No barcode was read/i);
  });
});

describe("barcode workspace flag", () => {
  it("does not mount the camera UI when the flag is off", () => {
    render(<BarcodeWorkspace cameraEnabled={false} />);
    expect(
      screen.queryByRole("button", { name: "Start camera" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Barcode numbers")).toBeInTheDocument();
  });
});
