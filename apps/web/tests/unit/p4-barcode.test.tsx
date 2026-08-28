import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BarcodeEntry } from "../../components/public/barcode-entry";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("manual barcode validation", () => {
  it("rejects a bad check digit without calling lookup", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<BarcodeEntry />);
    fireEvent.change(screen.getByLabelText("Barcode numbers"), {
      target: { value: "036000291453" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Look up barcode" }).closest("form")!,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/check digit/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the normalized GTIN for a valid UPC", () => {
    render(<BarcodeEntry />);
    fireEvent.change(screen.getByLabelText("Barcode numbers"), {
      target: { value: "036000291452" },
    });
    expect(screen.getByText(/Normalized GTIN-14/)).toBeInTheDocument();
  });
});
