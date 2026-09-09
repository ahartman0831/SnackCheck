import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IngredientCheckForm } from "@/components/public/ingredient-check-form";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

function submit() {
  fireEvent.change(screen.getByLabelText("Ingredient list"), {
    target: { value: "oats, sugar, salt" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Check this list" }).closest("form")!,
  );
}

describe("ingredient check recovery", () => {
  it("retains an in-memory draft when browser storage is denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied");
    });
    render(<IngredientCheckForm />);
    fireEvent.change(screen.getByLabelText("Ingredient list"), {
      target: { value: "oats, salt" },
    });
    expect(screen.getByLabelText("Ingredient list")).toHaveValue("oats, salt");
  });
  it("never confirms after extraction fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { submissionId: "one" } }))
      .mockResolvedValueOnce(
        Response.json({ error: { message: "Processing paused" } }, { status: 503 }),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<IngredientCheckForm />);
    submit();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Processing paused"),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Ingredient list")).toHaveValue("oats, sugar, salt");
  });
  it("uses the deterministic endpoint when submissions are unconfigured and explains that nothing was saved", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: { code: "SUBMISSIONS_DISABLED" } }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            ingredientStatus: "VERIFY",
            explanation: { summary: "Evidence needs verification." },
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<IngredientCheckForm />);
    submit();
    await waitFor(() => expect(screen.getByText(/Checked without saving/)).toBeVisible());
    expect(fetcher.mock.calls[1][0]).toBe("/api/v1/evaluations");
    expect(screen.getByText("Evidence needs verification.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Ingredient list"), {
      target: { value: "new ingredients" },
    });
    expect(screen.queryByText("Evidence needs verification.")).toBeNull();
  });
});
