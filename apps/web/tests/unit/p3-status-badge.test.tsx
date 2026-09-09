import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FreshnessBadge } from "../../components/ui/freshness-badge";
import { StatusBadge } from "../../components/ui/status-badge";

describe("status communication", () => {
  it("includes text and an accessible name, not color alone", () => {
    render(<StatusBadge status="FAIL" />);
    expect(screen.getByText("Potential listed restriction found")).toBeVisible();
    expect(screen.queryByText("FAIL", { exact: true })).not.toBeInTheDocument();
  });

  it("labels freshness in text", () => {
    render(<FreshnessBadge state="STALE" />);
    expect(screen.getByText("STALE")).toBeInTheDocument();
    expect(screen.getByText("Stale evidence")).toBeInTheDocument();
  });
});
