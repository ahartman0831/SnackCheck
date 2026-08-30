import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  cloneRulesetToDraft: vi.fn(),
  reviewRuleset: vi.fn(),
  publishRuleset: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/rules/ruleset-admin", () => ({
  cloneRulesetToDraft: mocks.cloneRulesetToDraft,
  reviewRuleset: mocks.reviewRuleset,
  publishRuleset: mocks.publishRuleset,
}));

import { POST as clone } from "@/app/api/admin/rulesets/clone/route";
import { POST as publish } from "@/app/api/admin/rulesets/publish/route";
import { POST as review } from "@/app/api/admin/rulesets/review/route";

const rulesetId = "11111111-1111-4111-8111-111111111111";
const hash = "a".repeat(64);
function request(path: string, body: unknown) {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 8 ruleset operation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      allowed: true,
      user: { id: "admin-1" },
    });
    mocks.cloneRulesetToDraft.mockResolvedValue("22222222-2222-4222-8222-222222222222");
    mocks.reviewRuleset.mockResolvedValue(undefined);
    mocks.publishRuleset.mockResolvedValue(undefined);
  });

  it("denies reviewers before invoking a database operation", async () => {
    mocks.requireAdmin.mockResolvedValue({ allowed: false, user: { id: "reviewer" } });
    const response = await clone(
      request("/api/admin/rulesets/clone", {
        sourceRulesetId: rulesetId,
        expectedHash: hash,
        confirmed: true,
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.cloneRulesetToDraft).not.toHaveBeenCalled();
  });

  it("requires an acknowledged current hash before cloning", async () => {
    const response = await clone(
      request("/api/admin/rulesets/clone", {
        sourceRulesetId: rulesetId,
        expectedHash: hash,
        confirmed: false,
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.cloneRulesetToDraft).not.toHaveBeenCalled();
  });

  it("accepts only HTTPS review evidence with a SHA-256", async () => {
    const response = await review(
      request("/api/admin/rulesets/review", {
        rulesetId,
        expectedHash: hash,
        reviewDocumentUrl: "http://example.test/review.pdf",
        reviewDocumentHash: hash,
        confirmed: true,
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.reviewRuleset).not.toHaveBeenCalled();
  });

  it("passes signed review evidence to the audited transaction", async () => {
    const response = await review(
      request("/api/admin/rulesets/review", {
        rulesetId,
        expectedHash: hash,
        reviewDocumentUrl: "https://example.test/review.pdf",
        reviewDocumentHash: hash,
        confirmed: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.reviewRuleset).toHaveBeenCalledWith(
      expect.objectContaining({
        rulesetId,
        expectedHash: hash,
        reviewDocumentHash: hash,
      }),
    );
  });

  it("requires the exact typed publication confirmation", async () => {
    const response = await publish(
      request("/api/admin/rulesets/publish", {
        rulesetId,
        expectedHash: hash,
        expectedReviewedAt: "2026-08-30T01:00:00.000Z",
        confirmation: "publish",
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.publishRuleset).not.toHaveBeenCalled();
  });

  it("maps stale publication evidence to a refresh-required conflict", async () => {
    mocks.publishRuleset.mockRejectedValue({ code: "40001" });
    const response = await publish(
      request("/api/admin/rulesets/publish", {
        rulesetId,
        expectedHash: hash,
        expectedReviewedAt: "2026-08-30T01:00:00.000Z",
        confirmation: "PUBLISH",
      }),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "EDIT_CONFLICT" },
    });
  });
});
