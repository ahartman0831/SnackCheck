import { ImageResponse } from "next/og";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${APP_NAME} — ${APP_TAGLINE}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "linear-gradient(135deg, #EEF2FF 0%, #ECFEFF 100%)",
        color: "#0F172A",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 42,
          fontWeight: 700,
        }}
      >
        SC
      </div>
      <div style={{ fontSize: 72, fontWeight: 700, marginTop: 32 }}>{APP_NAME}</div>
      <div style={{ fontSize: 28, color: "#475569", marginTop: 12 }}>{APP_TAGLINE}</div>
    </div>,
    size,
  );
}
