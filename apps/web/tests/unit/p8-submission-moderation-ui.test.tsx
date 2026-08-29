import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubmissionModerationControls } from "@/components/admin/submission-moderation-controls";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("Phase 8 submission moderation controls", () => {
  it("keeps every decision disabled until the reviewer acknowledges the evidence", async () => {
    render(
      <SubmissionModerationControls
        submissionId="11111111-1111-4111-8111-111111111111"
        expectedUpdatedAt="2026-08-29T12:34:05.000Z"
        status="EVALUATED"
      />,
    );

    expect(screen.getByRole("button", { name: "Move to review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  it("submits the acknowledged decision and refreshes current evidence", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { decision: "REVIEW_PENDING" } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <SubmissionModerationControls
        submissionId="11111111-1111-4111-8111-111111111111"
        expectedUpdatedAt="2026-08-29T12:34:05.000Z"
        status="EVALUATED"
      />,
    );

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Move to review" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/submissions/11111111-1111-4111-8111-111111111111/review",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          decision: "REVIEW_PENDING",
          expectedUpdatedAt: "2026-08-29T12:34:05.000Z",
          confirmed: true,
        }),
      }),
    );
  });
});
