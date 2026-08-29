import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../../..");
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("Phase 6 security boundaries", () => {
  it("keeps photo creation flag-gated and production flags false", () => {
    const creation = read("apps/web/app/api/v1/uploads/ingredient-label/route.ts");
    const example = read(".env.example");

    expect(creation).toContain("isIngredientPhotoEnabled()");
    expect(creation).toContain('from("submission-raw").createSignedUploadUrl');
    expect(example).toContain("FEATURE_INGREDIENT_PHOTO=false");
    expect(example).toContain("FEATURE_PHOTO_EXTRACTION=false");
    expect(example).toContain("NEXT_PUBLIC_FEATURE_INGREDIENT_PHOTO=false");
  });

  it("processes only private raw and sanitized buckets and stops before AI", () => {
    const completion = read(
      "apps/web/app/api/v1/submissions/[id]/upload-complete/route.ts",
    );

    expect(completion).toContain('from("submission-raw")');
    expect(completion).toContain('from("submission-sanitized")');
    expect(completion).toContain('status: "SANITIZED"');
    expect(completion).not.toMatch(/openai|gemini|vision-provider|evaluateCompliance/i);
  });

  it("requires exact signed ownership on every mutable submission route", () => {
    for (const route of [
      "apps/web/app/api/v1/submissions/[id]/extract/route.ts",
      "apps/web/app/api/v1/submissions/[id]/confirm/route.ts",
      "apps/web/app/api/v1/submissions/[id]/upload-complete/route.ts",
      "apps/web/app/api/v1/submissions/[id]/route.ts",
    ]) {
      expect(read(route)).toContain("ownsSubmission(token, id)");
    }
  });
});
