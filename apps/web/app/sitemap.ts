import type { MetadataRoute } from "next";
import { publicAppUrl } from "@/lib/brand";
import { listPublicSitemapEntries } from "@/lib/products/repository";

const STATIC_PATHS = [
  "",
  "/search",
  "/approved",
  "/rules/arizona",
  "/privacy",
  "/terms",
  "/disclosure",
  "/support",
  "/scan/barcode",
  "/scan/ingredients",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicAppUrl();
  const staticEntries = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  const published = await listPublicSitemapEntries();
  const dynamicEntries = published.map((entry) => ({
    url: `${base}${entry.path}`,
    changeFrequency: entry.kind === "product" ? ("weekly" as const) : ("weekly" as const),
    priority: 0.5,
  }));

  return [...staticEntries, ...dynamicEntries];
}
