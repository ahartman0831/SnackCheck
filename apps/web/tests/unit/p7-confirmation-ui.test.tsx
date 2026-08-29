import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubmissionConfirmation } from "@/components/upload/submission-confirmation";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Phase 7 confirmation UI", () => {
  it("shows extraction warnings and requires an explicit confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            extraction: {
              panelFound: true,
              rawText: "Sugar, salt",
              ingredientText: "Sugar, salt",
              ingredients: [],
              overallConfidence: 0.61,
              warnings: ["GLARE"],
            },
            confidence: 0.61,
            imageUrl: null,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SubmissionConfirmation submissionId="submission" />);

    expect(await screen.findByDisplayValue("Sugar, salt")).toBeInTheDocument();
    expect(screen.getByText(/Review carefully: glare/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm and check" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends the user's corrected text only after confirmation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              extraction: {
                panelFound: true,
                rawText: "Sugor",
                ingredientText: "Sugor",
                ingredients: [],
                overallConfidence: 0.9,
                warnings: [],
              },
              confidence: 0.9,
              imageUrl: null,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              result: {
                ingredientStatus: "VERIFY",
                explanation: { summary: "Needs review." },
              },
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<SubmissionConfirmation submissionId="submission" />);
    const field = await screen.findByDisplayValue("Sugor");
    await userEvent.clear(field);
    await userEvent.type(field, "Sugar");
    await userEvent.click(screen.getByRole("button", { name: "Confirm and check" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ correctedText: "Sugar" }),
    });
  });
});
