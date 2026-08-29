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

import { POST } from "@/app/api/admin/submissions/[id]/review/route";

const submissionId = "11111111-1111-4111-8111-111111111111";
const expectedUpdatedAt = "2026-08-29T12:34:05.000Z";

function request(body: unknown) {
  return new Request(
    `https://example.test/api/admin/submissions/${submissionId}/review`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const context = { params: Promise.resolve({ id: submissionId }) };

describe("Phase 8 submission moderation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ allowed: true });
    mocks.createUserServerClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
  });

  it("denies users who are not active reviewers", async () => {
    mocks.requireAdmin.mockResolvedValue({ allowed: false });
    const response = await POST(
      request({ decision: "REVIEW_PENDING", expectedUpdatedAt, confirmed: true }),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation", async () => {
    const response = await POST(
      request({ decision: "APPROVED", expectedUpdatedAt, confirmed: false }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("passes the expected version into the transactional moderation function", async () => {
    const response = await POST(
      request({ decision: "REVIEW_PENDING", expectedUpdatedAt, confirmed: true }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "moderate_submission",
      expect.objectContaining({
        p_submission_id: submissionId,
        p_expected_updated_at: expectedUpdatedAt,
        p_next_status: "REVIEW_PENDING",
      }),
    );
  });

  it("surfaces concurrent edits as a conflict", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    const response = await POST(
      request({ decision: "REJECTED", expectedUpdatedAt, confirmed: true }),
      context,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "EDIT_CONFLICT" },
    });
  });
});
