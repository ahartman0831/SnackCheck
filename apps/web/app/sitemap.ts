import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://canibringthis.com";
  return ["", "/search", "/approved", "/rules/arizona", "/privacy", "/terms"].map(
    (path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly",
      priority: path === "" ? 1 : 0.6,
    }),
  );
}
