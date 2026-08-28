import {
  BarcodeFormat,
  BrowserCodeReader,
  BrowserMultiFormatReader,
} from "@zxing/browser";
import { rearCameraConstraints } from "./session";

export interface ScanControls {
  stop: () => void;
}

export interface VideoDeviceOption {
  deviceId: string;
  label: string;
}

export interface StartScanOptions {
  video: HTMLVideoElement;
  deviceId?: string;
  onResult: (text: string) => void;
}

export async function listVideoDevices(): Promise<VideoDeviceOption[]> {
  const devices = await BrowserCodeReader.listVideoInputDevices();
  return devices.map((device, index) => ({
    deviceId: device.deviceId,
    label: device.label || `Camera ${index + 1}`,
  }));
}

export async function startBarcodeScan(options: StartScanOptions): Promise<ScanControls> {
  const stream = await navigator.mediaDevices.getUserMedia(
    rearCameraConstraints(options.deviceId),
  );
  options.video.srcObject = stream;
  await options.video.play().catch(() => undefined);

  const reader = new BrowserMultiFormatReader();
  reader.possibleFormats = [
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.EAN_8,
    BarcodeFormat.EAN_13,
  ];
  let controls: { stop: () => void } | null = null;
  void reader
    .decodeFromStream(stream, options.video, (result) => {
      if (result) {
        options.onResult(result.getText());
      }
    })
    .then((next) => {
      controls = next;
    })
    .catch(() => {
      // A live preview can still be shown if the decoder cannot attach.
    });
  return {
    stop() {
      controls?.stop();
      BrowserCodeReader.releaseAllStreams();
      for (const track of stream.getTracks()) {
        track.stop();
      }
      options.video.srcObject = null;
    },
  };
}
