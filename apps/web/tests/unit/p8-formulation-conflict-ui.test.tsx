import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormulationConflictControls } from "@/components/admin/formulation-conflict-controls";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("Phase 8 formulation conflict controls", () => {
  const props = {
    conflictId: "11111111-1111-4111-8111-111111111111",
    leftUpdatedAt: "2026-08-29T12:34:05.000Z",
    rightUpdatedAt: "2026-08-29T12:35:05.000Z",
    leftEligible: true,
    rightEligible: true,
    open: true,
  };

  it("keeps every decision disabled until evidence is acknowledged", async () => {
    render(<FormulationConflictControls {...props} />);
    expect(screen.getByRole("button", { name: "Use left formulation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Use right formulation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject both" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Use left formulation" })).toBeEnabled();
  });

  it("never enables a formulation that lacks verified source evidence", async () => {
    render(<FormulationConflictControls {...props} rightEligible={false} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Use right formulation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject both" })).toBeEnabled();
  });

  it("sends both evidence versions and refreshes after a decision", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<FormulationConflictControls {...props} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Reject both" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/formulation-conflicts/11111111-1111-4111-8111-111111111111/resolve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          decision: "NEITHER",
          leftUpdatedAt: props.leftUpdatedAt,
          rightUpdatedAt: props.rightUpdatedAt,
          confirmed: true,
        }),
      }),
    );
  });
});
