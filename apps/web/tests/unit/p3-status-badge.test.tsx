import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FreshnessBadge } from "../../components/ui/freshness-badge";
import { StatusBadge } from "../../components/ui/status-badge";

describe("status communication", () => {
  it("includes text and an accessible name, not color alone", () => {
    render(<StatusBadge status="FAIL" />);
    expect(screen.getByText("FAIL")).toBeInTheDocument();
    expect(screen.getByText("Doesn't pass AZ ingredient check")).toBeInTheDocument();
  });

  it("labels freshness in text", () => {
    render(<FreshnessBadge state="STALE" />);
    expect(screen.getByText("STALE")).toBeInTheDocument();
    expect(screen.getByText("Stale evidence")).toBeInTheDocument();
  });
});
