import type { Metadata } from "next";
import { APP_DESCRIPTION, APP_NAME, publicAppUrl } from "./brand";

export function pageMetadata(input: {
  title: string;
  description?: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = `${publicAppUrl()}${input.path}`;
  const description = input.description ?? APP_DESCRIPTION;
  return {
    title: input.title,
    description,
    alternates: { canonical: url },
    robots: input.index === false ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${input.title} · ${APP_NAME}`,
      description,
      url,
      siteName: APP_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} · ${APP_NAME}`,
      description,
    },
  };
}
