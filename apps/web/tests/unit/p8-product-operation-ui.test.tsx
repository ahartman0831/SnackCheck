import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductCreateControls } from "@/components/admin/product-create-controls";
import { ProductMergeControls } from "@/components/admin/product-merge-controls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
afterEach(() => cleanup());

describe("Phase 8 product operation controls", () => {
  it("requires product identity and evidence acknowledgement before creation", async () => {
    render(
      <ProductCreateControls
        submissionId="11111111-1111-4111-8111-111111111111"
        expectedUpdatedAt="2026-08-30T12:00:00Z"
        gtin14="00012345678905"
      />,
    );
    const button = screen.getByRole("button", { name: "Create product from evidence" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Brand"), "Test");
    await userEvent.type(screen.getByLabelText("Product name"), "Oats");
    await userEvent.click(screen.getAllByRole("checkbox")[1]!);
    expect(button).toBeEnabled();
  });

  it("requires a canonical target, acknowledgement, and exact MERGE text", async () => {
    render(
      <ProductMergeControls
        sourceId="11111111-1111-4111-8111-111111111111"
        sourceUpdatedAt="2026-08-30T12:00:00Z"
        disabled={false}
        candidates={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            label: "Canonical Oats",
            updatedAt: "2026-08-30T12:00:00Z",
          },
        ]}
      />,
    );
    const button = screen.getByRole("button", { name: "Merge this duplicate" });
    expect(button).toBeDisabled();
    await userEvent.selectOptions(
      screen.getByLabelText("Keep this canonical product"),
      "22222222-2222-4222-8222-222222222222",
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByLabelText("Type MERGE"), "MERGE");
    expect(button).toBeEnabled();
  });
});
