import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  createBrowserSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: mocks.createBrowserSupabaseClient,
}));

import { AdminLoginForm } from "@/components/admin/admin-login-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("staging reviewer sign-in", () => {
  it("sends a one-time link back to the private candidate queue", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.createBrowserSupabaseClient.mockReturnValue({
      auth: { signInWithOtp: mocks.signInWithOtp },
    });
    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "reviewer@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me/i }));

    await waitFor(() => expect(mocks.signInWithOtp).toHaveBeenCalledOnce());
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "reviewer@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fadmin%2Fcatalog",
        shouldCreateUser: true,
      },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Check your email");
  });

  it("does not imply access was granted when Supabase is unavailable", async () => {
    mocks.createBrowserSupabaseClient.mockReturnValue(null);
    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "reviewer@example.com" },
    });
    fireEvent.submit(screen.getByRole("button").closest("form")!);

    expect(await screen.findByRole("status")).toHaveTextContent("not configured");
  });
});
