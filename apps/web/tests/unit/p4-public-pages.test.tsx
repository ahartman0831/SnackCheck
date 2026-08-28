import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../../app/page";
import PrivacyPage from "../../app/privacy/page";
import {
  OfflineState,
  ProductNotFoundState,
  SearchEmptyState,
  UnavailableRulesetState,
} from "../../components/public/page-states";
import { HighlightedText } from "../../components/public/highlighted-text";
import { StatusCard } from "../../components/compliance/status-card";
import { APP_TAGLINE } from "../../lib/public-copy";

describe("public route copy", () => {
  it("renders the homepage command center without camera claims", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: APP_TAGLINE })).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Enter a barcode" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Paste ingredients" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Show me what I can bring" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Scan ingredients")).not.toBeInTheDocument();
  });

  it("describes current privacy behavior only", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.queryByText(/EXIF is stripped/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/EXIF stripping/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Ingredient-photo processing is not active/i),
    ).toBeInTheDocument();
  });

  it("gives a next action for empty, unavailable, offline, and missing-product states", () => {
    const { rerender } = render(<SearchEmptyState />);
    expect(
      screen.getAllByRole("link", { name: "Enter a barcode" }).length,
    ).toBeGreaterThan(0);
    rerender(<UnavailableRulesetState />);
    expect(
      screen.getByRole("link", { name: "Read the Arizona sources" }),
    ).toBeInTheDocument();
    rerender(<OfflineState />);
    expect(screen.getByText(/cached PASS is not shown as current/i)).toBeInTheDocument();
    rerender(<ProductNotFoundState />);
    expect(
      screen.getAllByRole("link", { name: "Search products" }).length,
    ).toBeGreaterThan(0);
  });

  it("shows PASS, FAIL, and VERIFY as text plus an icon", () => {
    const { rerender } = render(
      <StatusCard status="PASS" summary="No prohibited ingredient matched." />,
    );
    expect(screen.getByText("PASS")).toBeInTheDocument();
    rerender(<StatusCard status="FAIL" summary="A prohibited ingredient matched." />);
    expect(screen.getByText("FAIL")).toBeInTheDocument();
    rerender(<StatusCard status="VERIFY" summary="The evidence is incomplete." />);
    expect(screen.getByText("VERIFY")).toBeInTheDocument();
  });

  it("highlights matched spans when offsets are valid", () => {
    render(<HighlightedText text="sugar, Red 40, salt" start={7} end={13} />);
    expect(screen.getByText("Red 40")).toBeInTheDocument();
  });
});
