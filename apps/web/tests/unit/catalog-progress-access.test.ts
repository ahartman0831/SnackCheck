import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCatalogCandidate, getCatalogProgress } from "@/lib/admin/catalog-candidates";
beforeEach(() => vi.clearAllMocks());
describe("private catalog progress access", () => {
  it("does not query private records for an unauthorized caller", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ allowed: false, user: null, role: null });
    expect(await getCatalogProgress()).toBeNull();
    expect(await getCatalogCandidate("candidate-1")).toEqual({ kind: "unauthorized" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it("reports unavailable counts instead of replacing a query failure with zeros", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      allowed: true,
      user: { id: "reviewer" },
      role: "REVIEWER",
    });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(resolve({ count: null, error: { message: "offline" } })),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => query) } as never);
    expect(await getCatalogProgress()).toBeNull();
  });
  it("keeps catalog-wide counts separate and applies role checks", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      allowed: true,
      user: { id: "reviewer" },
      role: "REVIEWER",
    });
    const counts = [589, 154, 67, 0, 0, 0];
    let index = 0;
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => {
        const count = counts[index++];
        const query = {
          select: vi.fn(),
          eq: vi.fn(),
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve(resolve({ count, error: null })),
        };
        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        return query;
      }),
    } as never);
    expect(await getCatalogProgress()).toEqual({
      imported: 589,
      queued: 154,
      evidenceRecords: 67,
      dossiers: 0,
      products: 0,
      publishedRules: 0,
    });
    expect(requireAdmin).toHaveBeenCalledWith([
      "REVIEWER",
      "REGULATORY_ADMIN",
      "SUPER_ADMIN",
    ]);
  });
});
