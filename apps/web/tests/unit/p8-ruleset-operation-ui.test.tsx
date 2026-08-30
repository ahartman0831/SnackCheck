import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RulesetOperationControls } from "@/components/admin/ruleset-operation-controls";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Phase 8 ruleset operation controls", () => {
  const draft = {
    rulesetId: "11111111-1111-4111-8111-111111111111",
    code: "AZ-HSA",
    expectedHash: "a".repeat(64),
    published: false,
    reviewedAt: "2026-08-30T01:00:00.000Z",
    reviewedByCurrentActor: false,
    publicationBlockers: ["publisher is required"],
  };

  it("keeps publication disabled until acknowledgement and exact typed confirmation", async () => {
    render(<RulesetOperationControls {...draft} />);
    const button = screen.getByRole("button", { name: "Publish AZ-HSA" });
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByLabelText("Type PUBLISH"), "PUBLISH");
    expect(button).toBeEnabled();
  });

  it("prevents the signed reviewer from publishing their own review", async () => {
    render(<RulesetOperationControls {...draft} reviewedByCurrentActor />);
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByLabelText("Type PUBLISH"), "PUBLISH");
    expect(screen.getByRole("button", { name: "Publish AZ-HSA" })).toBeDisabled();
    expect(
      screen.getByText(/another administrator must publish it/i),
    ).toBeInTheDocument();
  });

  it("blocks publication while evidence checks remain open", async () => {
    render(
      <RulesetOperationControls
        {...draft}
        publicationBlockers={[
          "signed reviewer and reviewed_at are required",
          "publisher is required",
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByLabelText("Type PUBLISH"), "PUBLISH");
    expect(screen.getByRole("button", { name: "Publish AZ-HSA" })).toBeDisabled();
  });
});
