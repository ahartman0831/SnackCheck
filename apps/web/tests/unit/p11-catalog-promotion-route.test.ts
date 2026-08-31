import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createUserServerClient: vi.fn(),
  rpc: vi.fn(),
  parseIngredients: vi.fn(),
  hashFormulation: vi.fn(),
  evaluateCompliance: vi.fn(),
  loadRuleset: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({
  createUserServerClient: mocks.createUserServerClient,
}));
vi.mock("@/lib/rules/arizona", () => ({
  loadPublishedArizonaRuleset: mocks.loadRuleset,
}));
vi.mock("@snackcheck/compliance", () => ({
  parseIngredients: mocks.parseIngredients,
  hashFormulation: mocks.hashFormulation,
  evaluateCompliance: mocks.evaluateCompliance,
}));

import { POST } from "@/app/api/admin/catalog-candidates/[id]/promote/route";
const candidateId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id: candidateId }) };
const valid = {
  expectedUpdatedAt: "2026-08-31T12:00:00.000Z",
  brand: "Fixture",
  name: "Oat Bites",
  variant: "",
  size: "6 oz",
  category: "Snacks",
  slug: "fixture-oat-bites",
  individuallyPackaged: true,
  verifiedIngredientText: "Oats, salt",
  evidenceUrl: "https://fixture.example/oat-bites",
  evidenceTitle: "Official ingredients",
  observedAt: "2026-08-31T12:00:00.000Z",
  confirmed: true,
};
function request(body: unknown) {
  return new Request(
    `https://example.test/api/admin/catalog-candidates/${candidateId}/promote`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("Phase 11 catalog candidate promotion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ allowed: true });
    mocks.createUserServerClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    mocks.parseIngredients.mockReturnValue({
      ingredients: [
        {
          ordinal: 0,
          raw: "Oats",
          normalized: "oats",
          parentOrdinal: null,
          presenceKind: "DECLARED",
        },
      ],
      normalizedText: "oats salt",
      warnings: [],
    });
    mocks.hashFormulation.mockReturnValue("a".repeat(64));
    mocks.loadRuleset.mockResolvedValue({});
    mocks.evaluateCompliance.mockReturnValue({
      ingredientStatus: "PASS",
      applicabilityStatus: "APPLIES",
      localPolicyStatus: "NOT_REQUESTED",
      matchedRules: [],
      qualityFlags: [],
      rulesetHash: "b".repeat(64),
      formulationHash: "a".repeat(64),
      engineVersion: "test",
      evaluatedAt: valid.observedAt,
      explanation: {},
    });
  });
  it("rejects USDA as purported manufacturer evidence", async () => {
    const response = await POST(
      request({ ...valid, evidenceUrl: "https://fdc.nal.usda.gov/product" }),
      context,
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires explicit reviewer confirmation", async () => {
    const response = await POST(request({ ...valid, confirmed: false }), context);
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("parses and evaluates confirmed text before the promotion transaction", async () => {
    const response = await POST(request(valid), context);
    expect(response.status).toBe(200);
    expect(mocks.parseIngredients).toHaveBeenCalledWith("Oats, salt");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_promote_catalog_candidate",
      expect.objectContaining({
        p_candidate_id: candidateId,
        p_promotion: expect.objectContaining({
          evidenceUrl: valid.evidenceUrl,
          formulationHash: "a".repeat(64),
        }),
      }),
    );
  });
});
