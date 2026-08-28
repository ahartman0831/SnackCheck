import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IngredientPhotoUpload } from "../../components/upload/ingredient-photo-upload";

describe("Phase 6 ingredient photo UI", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: vi.fn(() => "blob:ingredient-preview"),
      },
      revokeObjectURL: { configurable: true, value: vi.fn() },
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
    vi.unstubAllGlobals();
  });

  it("explains privacy and never claims the photo was evaluated", () => {
    render(<IngredientPhotoUpload />);

    expect(screen.getByText(/original photo is private/i)).toBeInTheDocument();
    expect(screen.getByText(/No AI reads or evaluates/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Take or choose photo" }),
    ).toBeInTheDocument();
  });

  it("creates a private upload, uploads, sanitizes, and reports only readiness", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              submissionId: "11111111-1111-1111-1111-111111111111",
              path: "11111111-1111-1111-1111-111111111111/raw",
              uploadUrl: "https://storage.example/upload",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { status: "SANITIZED" } }), { status: 202 }),
      );

    const { container } = render(<IngredientPhotoUpload />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    await userEvent.upload(
      input as HTMLInputElement,
      new File([new Uint8Array([137, 80, 78, 71])], "ingredients.png", {
        type: "image/png",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Upload photo privately" }));

    await waitFor(() =>
      expect(screen.getByText(/Photo safely prepared/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/not been evaluated/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/uploads/ingredient-label", {
      method: "POST",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/submissions/11111111-1111-1111-1111-111111111111/upload-complete",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
