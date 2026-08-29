import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUserServerClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createUserServerClient: mocks.createUserServerClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { requireAdmin } from "@/lib/auth/require-admin";

describe("Phase 8 admin authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createUserServerClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
    mocks.createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: mocks.maybeSingle }),
        }),
      }),
    });
  });

  it("does not query membership without an authenticated user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(requireAdmin()).resolves.toMatchObject({ allowed: false, role: null });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("denies signed-in users who are not active members", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { role: "REVIEWER", active: false } });

    await expect(requireAdmin()).resolves.toMatchObject({ allowed: false, role: null });
  });

  it("allows an active reviewer to review but not publish", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { role: "REVIEWER", active: true } });

    await expect(requireAdmin(["REVIEWER"])).resolves.toMatchObject({
      allowed: true,
      role: "REVIEWER",
    });
    await expect(
      requireAdmin(["REGULATORY_ADMIN", "SUPER_ADMIN"]),
    ).resolves.toMatchObject({
      allowed: false,
      role: "REVIEWER",
    });
  });
});
