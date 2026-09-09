import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertStagingApplySafety,
  assertStagingRuntimeSafety,
} from "@/lib/catalog-candidates/operation-safety";

const confirmation = "APPLY_TEST_TO_STAGING";
const url = "https://stagingfixture.supabase.co";

function configureStaging(): void {
  vi.stubEnv("CATALOG_STAGING_SUPABASE_PROJECT_REF", "stagingfixture");
  vi.stubEnv("SUPABASE_PROJECT_ID", "stagingfixture");
  vi.stubEnv("CATALOG_PRODUCTION_SUPABASE_PROJECT_REF", "productionfixture");
}

afterEach(() => vi.unstubAllEnvs());

describe("catalog operation staging safety", () => {
  it("allows an exactly confirmed designated staging operation", () => {
    configureStaging();
    expect(() =>
      assertStagingApplySafety({
        argv: ["--target", "staging", "--confirm", confirmation],
        confirmation,
        url,
      }),
    ).not.toThrow();
  });

  it("refuses the production Vercel environment", () => {
    configureStaging();
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() =>
      assertStagingApplySafety({
        argv: ["--target", "staging", "--confirm", confirmation],
        confirmation,
        url,
      }),
    ).toThrow("production Vercel environment");
  });

  it("refuses a designated production Supabase project", () => {
    configureStaging();
    vi.stubEnv("CATALOG_PRODUCTION_SUPABASE_PROJECT_REF", "stagingfixture");
    expect(() =>
      assertStagingApplySafety({
        argv: ["--target", "staging", "--confirm", confirmation],
        confirmation,
        url,
      }),
    ).toThrow("production Supabase project");
  });

  it("requires both staging references and the exact confirmation", () => {
    configureStaging();
    vi.stubEnv("SUPABASE_PROJECT_ID", "otherfixture");
    expect(() =>
      assertStagingApplySafety({
        argv: ["--target", "staging", "--confirm", confirmation],
        confirmation,
        url,
      }),
    ).toThrow("both staging project references");
  });
});

describe("catalog runtime staging safety", () => {
  it("allows the designated database only in preview", () => {
    configureStaging();
    expect(() =>
      assertStagingRuntimeSafety({
        url,
        vercelEnvironment: "preview",
      }),
    ).not.toThrow();
  });

  it("refuses production deployments and production databases", () => {
    configureStaging();
    expect(() =>
      assertStagingRuntimeSafety({
        url,
        vercelEnvironment: "production",
      }),
    ).toThrow("only in a Vercel preview");
    expect(() =>
      assertStagingRuntimeSafety({
        url: "https://productionfixture.supabase.co",
        vercelEnvironment: "preview",
      }),
    ).toThrow("production Supabase project");
  });
});
