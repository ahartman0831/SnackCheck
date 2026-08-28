import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IngredientCheckForm } from "../../components/public/ingredient-check-form";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("gtin=00000000000017"),
}));

describe("manual ingredient preservation", () => {
  it("keeps pasted text after a recoverable failure", async () => {
    window.sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    render(<IngredientCheckForm />);
    const box = screen.getByLabelText("Ingredient list");
    fireEvent.change(box, { target: { value: "sugar, salt, Red 40" } });
    fireEvent.submit(
      screen.getByRole("button", { name: "Check this list" }).closest("form")!,
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/still here/i);
    });
    expect(box).toHaveValue("sugar, salt, Red 40");
    expect(window.sessionStorage.getItem("snackcheck-ingredient-draft")).toBe(
      "sugar, salt, Red 40",
    );
    expect(screen.getByText(/Preserved GTIN/)).toBeInTheDocument();
  });
});
