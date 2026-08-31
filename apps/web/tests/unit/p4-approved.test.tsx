import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApprovedFilters } from "../../components/public/approved-filters";
import { APPROVED_FORBIDDEN, APPROVED_HEADING } from "../../lib/public-copy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("approved browser filters", () => {
  it("exposes category chips and a clear-all control", () => {
    render(
      <ApprovedFilters
        categories={["bars"]}
        brands={["Example"]}
        values={{ category: "bars", brand: "Example" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Bars" })).toHaveAttribute(
      "href",
      "/approved?category=bars",
    );
    expect(screen.getAllByRole("link", { name: "Clear all" }).length).toBeGreaterThan(0);
  });

  it("does not use forbidden approval language", () => {
    for (const phrase of APPROVED_FORBIDDEN) {
      expect(APPROVED_HEADING.toLowerCase()).not.toContain(phrase);
    }
  });
});
