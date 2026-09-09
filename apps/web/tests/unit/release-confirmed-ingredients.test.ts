// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { arizonaRuleset, unavailableRuleset } from "@snackcheck/compliance";

const mocks = vi.hoisted(() => ({ rules: vi.fn(), owns: vi.fn(), rpc: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "local-test-ownership" }) }),
}));
vi.mock("@/lib/submissions/submission-ownership", () => ({ ownsSubmission: mocks.owns }));
vi.mock("@/lib/rules/arizona", () => ({
  loadPublishedArizonaRuleset: mocks.rules,
  isUsablePublishedRuleset: (rules: { isPublished: boolean }) => rules.isPublished,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
import { POST } from "@/app/api/v1/submissions/[id]/confirm/route";

const confirm = (correctedText: string) =>
  POST(
    new Request("https://example.test/api/v1/submissions/fixture/confirm", {
      method: "POST",
      body: JSON.stringify({ correctedText }),
    }),
    { params: Promise.resolve({ id: "fixture" }) },
  );

describe("release candidate confirmed-text boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.owns.mockResolvedValue(true);
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.rules.mockResolvedValue(arizonaRuleset());
  });

  it("flags a declared restriction using the actual engine and persists that result", async () => {
    const response = await confirm("wheat flour, potassium bromate, salt");
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.result.ingredientStatus).toBe("FAIL");
    expect(data.result.matchedRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ canonicalName: "Potassium bromate" }),
      ]),
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "persist_confirmed_submission_evaluation",
      expect.objectContaining({ p_evaluation_result: data.result }),
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("keeps a no-match user list unverified even with published fixture rules", async () => {
    const { data } = await (await confirm("oats, sugar, salt")).json();
    expect(data.result.ingredientStatus).toBe("VERIFY");
    expect(data.result.matchedRules).toEqual([]);
    expect(data.result.qualityFlags).toContain("UNCONFIRMED_EVIDENCE");
    expect(data.result.qualityFlags).not.toContain("RULESET_UNAVAILABLE");
  });

  it("does not match restrictions when the ruleset is unavailable", async () => {
    mocks.rules.mockResolvedValue(unavailableRuleset());
    const { data } = await (await confirm("wheat flour, potassium bromate, salt")).json();
    expect(data.result.ingredientStatus).toBe("VERIFY");
    expect(data.result.matchedRules).toEqual([]);
    expect(data.result.qualityFlags).toContain("RULESET_UNAVAILABLE");
  });

  it("cannot persist or clear ownership on a failed confirmation", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const response = await confirm("oats, sugar, salt");
    expect(response.status).toBe(409);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("refuses an unowned list before reading rules or writing evidence", async () => {
    mocks.owns.mockResolvedValue(false);
    expect((await confirm("oats, sugar, salt")).status).toBe(403);
    expect(mocks.rules).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
