import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createUserServerClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({
  createUserServerClient: mocks.createUserServerClient,
}));

import { POST } from "@/app/api/admin/formulation-conflicts/[id]/resolve/route";

const conflictId = "11111111-1111-4111-8111-111111111111";
const leftUpdatedAt = "2026-08-29T12:34:05.000Z";
const rightUpdatedAt = "2026-08-29T12:35:05.000Z";
const context = { params: Promise.resolve({ id: conflictId }) };

function request(body: unknown) {
  return new Request(
    `https://example.test/api/admin/formulation-conflicts/${conflictId}/resolve`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("Phase 8 formulation conflict route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ allowed: true });
    mocks.createUserServerClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
  });

  it("denies users who are not active reviewers", async () => {
    mocks.requireAdmin.mockResolvedValue({ allowed: false });
    const response = await POST(
      request({ decision: "LEFT", leftUpdatedAt, rightUpdatedAt, confirmed: true }),
      context,
    );
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires explicit evidence acknowledgement", async () => {
    const response = await POST(
      request({ decision: "LEFT", leftUpdatedAt, rightUpdatedAt, confirmed: false }),
      context,
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("passes both evidence versions into the transaction", async () => {
    const response = await POST(
      request({ decision: "RIGHT", leftUpdatedAt, rightUpdatedAt, confirmed: true }),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "resolve_formulation_conflict",
      expect.objectContaining({
        p_conflict_id: conflictId,
        p_decision: "RIGHT",
        p_expected_left_updated_at: leftUpdatedAt,
        p_expected_right_updated_at: rightUpdatedAt,
      }),
    );
  });

  it("surfaces stale evidence as a conflict", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    const response = await POST(
      request({ decision: "NEITHER", leftUpdatedAt, rightUpdatedAt, confirmed: true }),
      context,
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "EDIT_CONFLICT" },
    });
  });
});
