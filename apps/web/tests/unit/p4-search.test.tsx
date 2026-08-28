import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductSearch } from "../../components/public/product-search";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const sample = {
  id: "prod-1",
  slug: "plain-oat-bars",
  brand: "Example",
  name: "Oat Bars",
  variant: null,
  size: "6 oz",
  category: "bars",
  imageUrl: null,
  imageAttribution: null,
  ingredientStatus: "PASS" as const,
  verificationStatus: "VERIFIED" as const,
  lastVerifiedAt: "2026-08-01T00:00:00.000Z",
  freshnessState: "CURRENT" as const,
  formulationConflict: false,
  rulesetHash: "hash",
};

describe("search states", () => {
  beforeEach(() => {
    push.mockReset();
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [sample] }),
      })),
    );
  });

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("asks for two characters before searching", () => {
    render(<ProductSearch live />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a" } });
    expect(screen.getByText("Type at least two characters.")).toBeInTheDocument();
  });

  it("renders an empty state when the provider returns nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [] }),
      })),
    );
    render(<ProductSearch initialQuery="zzzz" live />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.getByText("No products matched that search")).toBeInTheDocument();
  });

  it("renders an error state with retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: { message: "down" } }),
      })),
    );
    render(<ProductSearch initialQuery="oats" live />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.getByText("This check is unavailable")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Try again" }).length).toBeGreaterThan(
      0,
    );
  });
});
