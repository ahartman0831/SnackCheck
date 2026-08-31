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

import { POST } from "@/app/api/admin/catalog-candidates/[id]/review/route";

const candidateId = "11111111-1111-4111-8111-111111111111";
const expectedUpdatedAt = "2026-08-31T12:00:00.000Z";
const context = { params: Promise.resolve({ id: candidateId }) };
function request(body: unknown) {
  return new Request(
    `https://example.test/api/admin/catalog-candidates/${candidateId}/review`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("Phase 11 catalog candidate review route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ allowed: true });
    mocks.createUserServerClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
  });
  it("denies users who are not active reviewers", async () => {
    mocks.requireAdmin.mockResolvedValue({ allowed: false });
    const response = await POST(
      request({ decision: "QUEUE", expectedUpdatedAt, reason: "", confirmed: true }),
      context,
    );
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires a meaningful rejection reason", async () => {
    const response = await POST(
      request({ decision: "REJECT", expectedUpdatedAt, reason: "no", confirmed: true }),
      context,
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("passes the evidence version into the review transaction", async () => {
    const response = await POST(
      request({
        decision: "QUEUE",
        expectedUpdatedAt,
        reason: "source reviewed",
        confirmed: true,
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_review_catalog_candidate",
      expect.objectContaining({
        p_candidate_id: candidateId,
        p_expected_updated_at: expectedUpdatedAt,
        p_decision: "QUEUE",
      }),
    );
  });
  it("surfaces concurrent changes", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    const response = await POST(
      request({ decision: "QUEUE", expectedUpdatedAt, reason: "", confirmed: true }),
      context,
    );
    expect(response.status).toBe(409);
  });
});
