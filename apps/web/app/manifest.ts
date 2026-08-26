import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Can I Bring This?",
    short_name: "Can I Bring This",
    description: "Arizona Healthy Schools Act ingredient checker",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#c45c26",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
