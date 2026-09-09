import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminFromRequest: vi.fn(),
  createAdminClient: vi.fn(),
  plan: vi.fn(),
  execute: vi.fn(),
  safety: vi.fn(),
  single: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdminFromRequest: mocks.requireAdminFromRequest,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/catalog-evidence/ai-comparison-runner", () => ({
  planCatalogAiComparisons: mocks.plan,
  executeCatalogAiComparisons: mocks.execute,
}));
vi.mock("@/lib/catalog-candidates/operation-safety", () => ({
  assertStagingRuntimeSafety: mocks.safety,
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://stagingfixture.supabase.co",
    OPENAI_API_KEY: "secret",
    OPENAI_VISION_MODEL: "gpt-5.6-luna",
    VERCEL_ENV: "preview",
  },
}));

import { POST } from "@/app/api/admin/catalog-evidence/ai-compare/route";

const candidateId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown) {
  return new Request("https://example.test/api/admin/catalog-evidence/ai-compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 11 controlled catalog AI route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safety.mockReset();
    mocks.requireAdminFromRequest.mockResolvedValue({ allowed: true });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mocks.single,
    };
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });
    mocks.plan.mockResolvedValue([{ candidate: { id: candidateId } }]);
    mocks.execute.mockResolvedValue([]);
    mocks.single.mockResolvedValue({
      data: {
        status: "COMPLETED",
        planned_candidates: 1,
        attempted_candidates: 1,
        continued_candidates: 1,
        human_exception_candidates: 0,
        failed_candidates: 0,
        estimated_total_cost_usd: 0.001,
      },
      error: null,
    });
  });

  it("requires active owner access", async () => {
    mocks.requireAdminFromRequest.mockResolvedValue({ allowed: false });
    const response = await POST(
      request({
        candidateIds: [candidateId],
        confirmation: "RUN_STAGING_AI_COMPARISON",
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.plan).not.toHaveBeenCalled();
  });

  it("rejects missing confirmation and duplicate candidates", async () => {
    const missing = await POST(request({ candidateIds: [candidateId] }));
    const duplicate = await POST(
      request({
        candidateIds: [candidateId, candidateId],
        confirmation: "RUN_STAGING_AI_COMPARISON",
      }),
    );
    expect(missing.status).toBe(400);
    expect(duplicate.status).toBe(400);
    expect(mocks.plan).not.toHaveBeenCalled();
  });

  it("checks staging safety before planning a run", async () => {
    mocks.safety.mockImplementation(() => {
      throw new Error("production denied");
    });
    const response = await POST(
      request({
        candidateIds: [candidateId],
        confirmation: "RUN_STAGING_AI_COMPARISON",
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.plan).not.toHaveBeenCalled();
  });

  it("runs only the explicitly selected candidates", async () => {
    const response = await POST(
      request({
        candidateIds: [candidateId],
        confirmation: "RUN_STAGING_AI_COMPARISON",
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.safety).toHaveBeenCalled();
    expect(mocks.plan).toHaveBeenCalledWith(expect.anything(), [candidateId]);
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-5.6-luna" }),
    );
  });
});
