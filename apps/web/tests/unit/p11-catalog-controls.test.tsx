import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogCandidateControls } from "@/components/admin/catalog-candidate-controls";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const defaults = {
  brand: "Fixture",
  name: "Oats",
  variant: "",
  size: "",
  category: "Snacks",
  verifiedIngredientText: "Oats, salt",
};

describe("Phase 11 catalog candidate controls", () => {
  it("keeps queue and reject actions locked until evidence is acknowledged", async () => {
    render(
      <CatalogCandidateControls
        candidateId="11111111-1111-4111-8111-111111111111"
        expectedUpdatedAt="2026-08-31T12:00:00.000Z"
        state="SCREENED_PASS"
        defaults={defaults}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Queue for promotion review" }),
    ).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(
      screen.getByRole("button", { name: "Queue for promotion review" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reject candidate" })).toBeDisabled();
  });
  it("requires independent evidence and acknowledgement before promotion", async () => {
    render(
      <CatalogCandidateControls
        candidateId="11111111-1111-4111-8111-111111111111"
        expectedUpdatedAt="2026-08-31T12:00:00.000Z"
        state="REVIEW_QUEUED"
        defaults={defaults}
      />,
    );
    const button = screen.getByRole("button", { name: "Promote verified product" });
    expect(button).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText("Manufacturer evidence URL"),
      "https://fixture.example/oats",
    );
    await userEvent.type(screen.getByLabelText("Evidence title"), "Official ingredients");
    await userEvent.click(
      screen.getByLabelText(/I compared every ingredient with the linked manufacturer/i),
    );
    expect(button).toBeEnabled();
  });
  it("makes terminal candidates read-only", () => {
    render(
      <CatalogCandidateControls
        candidateId="11111111-1111-4111-8111-111111111111"
        expectedUpdatedAt="2026-08-31T12:00:00.000Z"
        state="PROMOTED"
        defaults={defaults}
      />,
    );
    expect(screen.getByText(/closed and cannot be changed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
