import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { parseCatalogCandidateFilters } from "@/lib/admin/catalog-candidates";

describe("catalog candidate automation filters", () => {
  it("defaults the reviewer workspace to automatic evidence work", () => {
    expect(parseCatalogCandidateFilters({})).toMatchObject({
      route: "AUTO_EVIDENCE",
      state: "REVIEW_QUEUED",
    });
  });

  it("accepts only known private automation routes", () => {
    expect(parseCatalogCandidateFilters({ route: "HUMAN_EXCEPTION" }).route).toBe(
      "HUMAN_EXCEPTION",
    );
    expect(parseCatalogCandidateFilters({ route: "DROP TABLE" }).route).toBe(
      "AUTO_EVIDENCE",
    );
  });
});
