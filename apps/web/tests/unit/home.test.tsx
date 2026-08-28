import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../../app/page";
import { APP_TAGLINE } from "../../lib/public-copy";

describe("home page", () => {
  it("renders the product promise", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: APP_TAGLINE })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Check packaged-food ingredients against Arizona’s school distribution rules.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
  });
});
