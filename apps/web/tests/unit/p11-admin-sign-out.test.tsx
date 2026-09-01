import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  createBrowserSupabaseClient: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: mocks.createBrowserSupabaseClient,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("reviewer sign-out", () => {
  it("ends the Supabase session", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.createBrowserSupabaseClient.mockReturnValue({
      auth: { signOut: mocks.signOut },
    });
    render(<AdminSignOutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.replace).toHaveBeenCalledWith("/admin/login");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
