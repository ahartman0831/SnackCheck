import { describe, expect, it } from "vitest";
import { pageMetadata } from "../../lib/seo";
import { publicAppUrl } from "../../lib/brand";

describe("metadata and sitemap helpers", () => {
  it("builds canonical URLs from configuration", () => {
    const metadata = pageMetadata({
      title: "Search",
      path: "/search",
      description: "Search packaged foods.",
    });
    expect(metadata.alternates?.canonical).toBe(`${publicAppUrl()}/search`);
    expect(metadata.openGraph?.url).toBe(`${publicAppUrl()}/search`);
    expect(metadata.robots).toBeUndefined();
  });

  it("noindexes private surfaces when requested", () => {
    const metadata = pageMetadata({
      title: "Confirm",
      path: "/scan/confirm/abc",
      index: false,
    });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
