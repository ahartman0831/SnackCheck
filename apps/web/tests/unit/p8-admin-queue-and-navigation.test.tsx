import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

import AdminLayout from "@/app/admin/layout";
import { parseFormulationConflictFilters } from "@/lib/admin/formulation-conflicts";
import { parseSubmissionQueueFilters } from "@/lib/admin/submission-queue";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Phase 8 admin queue and navigation", () => {
  it("shows reviewers only the operations they are permitted to use", async () => {
    mocks.requireAdmin.mockResolvedValue({ allowed: true, role: "REVIEWER" });
    render(await AdminLayout({ children: <p>Queue content</p> }));

    expect(screen.getByRole("link", { name: "Submissions" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Rules" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /schools/i })).not.toBeInTheDocument();
  });

  it("adds rules navigation only for regulatory administrators", async () => {
    mocks.requireAdmin.mockResolvedValue({
      allowed: true,
      role: "REGULATORY_ADMIN",
    });
    render(await AdminLayout({ children: <p>Rules content</p> }));

    expect(screen.getByRole("link", { name: "Rules" })).toHaveAttribute(
      "href",
      "/admin/rules",
    );
  });

  it("normalizes unknown or repeated queue parameters to safe defaults", () => {
    expect(
      parseSubmissionQueueFilters({
        state: "unexpected",
        attention: ["failed", "low-confidence"],
        order: "sideways",
        query: `  ${"a".repeat(80)}  `,
      }),
    ).toEqual({
      state: "all",
      attention: "failed",
      order: "newest",
      query: "a".repeat(64),
    });

    expect(
      parseFormulationConflictFilters({
        order: ["newest", "oldest"],
        query: ` ${"p".repeat(100)} `,
      }),
    ).toEqual({ order: "newest", query: "p".repeat(80) });
  });
});
