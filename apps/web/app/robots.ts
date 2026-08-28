import type { MetadataRoute } from "next";
import { publicAppUrl } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/auth", "/scan/confirm", "/dev"],
      },
    ],
    sitemap: `${publicAppUrl()}/sitemap.xml`,
  };
}
