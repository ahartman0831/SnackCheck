import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_RESPONSE_HEADERS,
} from "@/lib/security/response-headers";

describe("Phase 10 security headers", () => {
  const headers = new Map(
    SECURITY_RESPONSE_HEADERS.map(({ key, value }) => [key, value]),
  );

  it("locks down browser capabilities and transport", () => {
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
    expect(headers.get("Permissions-Policy")).toContain("microphone=()");
  });

  it("prevents framing, plugins, hostile base URLs, and unsafe eval", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("form-action 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
  });

  it("does not require Google Fonts during a production build", () => {
    const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).not.toContain('from "next/font/google"');
  });
});
