import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  createBrowserSupabaseClient: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
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
  it("sends a one-time code without depending on a browser callback", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.createBrowserSupabaseClient.mockReturnValue({
      auth: { signInWithOtp: mocks.signInWithOtp, verifyOtp: mocks.verifyOtp },
    });
    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "reviewer@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me/i }));

    await waitFor(() => expect(mocks.signInWithOtp).toHaveBeenCalledOnce());
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "reviewer@example.com",
      options: { shouldCreateUser: true },
    });
    expect(screen.getByLabelText("Six-digit sign-in code")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Enter the six-digit code");
  });

  it("verifies the emailed code and opens the private candidate queue", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
    mocks.createBrowserSupabaseClient.mockReturnValue({
      auth: { signInWithOtp: mocks.signInWithOtp, verifyOtp: mocks.verifyOtp },
    });
    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "reviewer@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me/i }));
    const input = await screen.findByLabelText("Six-digit sign-in code");
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.verifyOtp).toHaveBeenCalledOnce());
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      email: "reviewer@example.com",
      token: "123456",
      type: "email",
    });
    expect(mocks.replace).toHaveBeenCalledWith("/admin/catalog");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("keeps the user on the code screen when a code is rejected", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: new Error("expired") });
    mocks.createBrowserSupabaseClient.mockReturnValue({
      auth: { signInWithOtp: mocks.signInWithOtp, verifyOtp: mocks.verifyOtp },
    });
    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "reviewer@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me/i }));
    fireEvent.change(await screen.findByLabelText("Six-digit sign-in code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("status")).toHaveTextContent("incorrect or expired");
    expect(mocks.replace).not.toHaveBeenCalled();
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
