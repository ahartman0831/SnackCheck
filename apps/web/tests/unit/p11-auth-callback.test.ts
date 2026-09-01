import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { safeAdminDestination } from "@/lib/auth/admin-destination";

describe("reviewer auth callback", () => {
  it("allows only local admin destinations", () => {
    expect(safeAdminDestination("/admin/catalog?state=REVIEW_QUEUED")).toBe(
      "/admin/catalog?state=REVIEW_QUEUED",
    );
    expect(safeAdminDestination("https://attacker.example/admin")).toBe("/admin");
    expect(safeAdminDestination("//attacker.example/admin")).toBe("/admin");
    expect(safeAdminDestination("/administrator")).toBe("/admin");
    expect(safeAdminDestination("/search")).toBe("/admin");
    expect(safeAdminDestination(null)).toBe("/admin");
  });
});
