// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));
import { proxy } from "@/proxy";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("reviewer session refresh", () => {
  it("forwards refreshed cookies to both the renderer and the browser", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    mocks.create.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: async () => {
          mocks.getUser();
          options.cookies.setAll([
            {
              name: "sb-session",
              value: "refreshed-test-session",
              options: { path: "/", httpOnly: true },
            },
          ]);
          return { data: { user: { id: "reviewer" } } };
        },
      },
    }));
    const request = new NextRequest("https://snack.test/admin");
    const response = await proxy(request);
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(request.cookies.get("sb-session")?.value).toBe("refreshed-test-session");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed-test-session");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("keeps the unconfigured public shell usable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await proxy(new NextRequest("https://snack.test/admin/login"))).status).toBe(
      200,
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
