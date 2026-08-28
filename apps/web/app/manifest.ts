import type { MetadataRoute } from "next";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  BACKGROUND_LIGHT,
  THEME_COLOR_LIGHT,
} from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: BACKGROUND_LIGHT,
    theme_color: THEME_COLOR_LIGHT,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-mono.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "monochrome",
      },
    ],
  };
}
