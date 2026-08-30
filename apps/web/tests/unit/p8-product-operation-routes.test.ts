import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createUserServerClient: vi.fn(),
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({
  createUserServerClient: mocks.createUserServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { POST as createProduct } from "@/app/api/admin/products/from-submission/route";
import { POST as mergeProduct } from "@/app/api/admin/products/[id]/merge/route";

const productId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const submissionId = "33333333-3333-4333-8333-333333333333";
const updatedAt = "2026-08-30T12:00:00.000Z";
const request = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("Phase 8 product operation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ allowed: true });
    mocks.createUserServerClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: { product_id: productId }, error: null });
    mocks.maybeSingle.mockResolvedValue({
      data: { corrected_text: "Oats, salt", normalized_gtin14: "00012345678905" },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      }),
    });
  });

  it("denies product mutations to users who are not active reviewers", async () => {
    mocks.requireAdmin.mockResolvedValue({ allowed: false });
    const response = await mergeProduct(
      request(`https://example.test/api/admin/products/${productId}/merge`, {
        targetProductId: targetId,
        sourceUpdatedAt: updatedAt,
        targetUpdatedAt: updatedAt,
        confirmed: true,
        confirmation: "MERGE",
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before creating a product", async () => {
    const response = await createProduct(
      request("https://example.test/api/admin/products/from-submission", {
        submissionId,
        expectedUpdatedAt: updatedAt,
        brand: "Test",
        name: "Oats",
        variant: "",
        size: "",
        category: "Snacks",
        slug: "test-oats",
        individuallyPackaged: true,
        confirmed: false,
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("parses confirmed text and invokes the signed-user product transaction", async () => {
    const response = await createProduct(
      request("https://example.test/api/admin/products/from-submission", {
        submissionId,
        expectedUpdatedAt: updatedAt,
        brand: "Test",
        name: "Oats",
        variant: "",
        size: "",
        category: "Snacks",
        slug: "test-oats",
        individuallyPackaged: true,
        confirmed: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_create_product_from_submission",
      expect.objectContaining({
        p_submission_id: submissionId,
        p_normalized_ingredient_text: "oats salt",
        p_identifier_type: "GTIN_14",
      }),
    );
  });

  it("requires typed MERGE confirmation", async () => {
    const response = await mergeProduct(
      request(`https://example.test/api/admin/products/${productId}/merge`, {
        targetProductId: targetId,
        sourceUpdatedAt: updatedAt,
        targetUpdatedAt: updatedAt,
        confirmed: true,
        confirmation: "merge",
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect(response.status).toBe(400);
  });

  it("passes both current product versions into the merge transaction", async () => {
    const response = await mergeProduct(
      request(`https://example.test/api/admin/products/${productId}/merge`, {
        targetProductId: targetId,
        sourceUpdatedAt: updatedAt,
        targetUpdatedAt: updatedAt,
        confirmed: true,
        confirmation: "MERGE",
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_merge_products",
      expect.objectContaining({
        p_source_product_id: productId,
        p_target_product_id: targetId,
        p_expected_source_updated_at: updatedAt,
        p_expected_target_updated_at: updatedAt,
      }),
    );
  });
});
