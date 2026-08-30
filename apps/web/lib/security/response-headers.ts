export function contentSecurityPolicy(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (nodeEnv === "development") scriptSources.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https:",
    "worker-src 'self' blob:",
  ].join("; ");
}

export const CONTENT_SECURITY_POLICY = contentSecurityPolicy();

export const SECURITY_RESPONSE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(), microphone=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
] as const;
