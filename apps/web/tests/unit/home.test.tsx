import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../../app/page";

describe("home page", () => {
  it("renders the product promise", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "Can I Bring This?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Arizona changed the school snack rules. We made them searchable.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
  });
});
