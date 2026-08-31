const baseUrlValue = process.env.SYNTHETIC_BASE_URL;
const monitorToken = process.env.SYNTHETIC_MONITOR_TOKEN;
if (!baseUrlValue) throw new Error("SYNTHETIC_BASE_URL is required.");
if (!monitorToken) throw new Error("SYNTHETIC_MONITOR_TOKEN is required.");

const baseUrl = new URL(baseUrlValue);
const checks = [
  { name: "home", path: "/", expected: [200] },
  { name: "public-health", path: "/api/health", expected: [200] },
  { name: "manual-barcode", path: "/scan/barcode", expected: [200] },
  { name: "privacy", path: "/privacy", expected: [200] },
  { name: "admin-boundary", path: "/api/admin/health", expected: [401] },
  {
    name: "protected-readiness",
    path: "/api/internal/health",
    expected: [200],
    authorization: true,
  },
];

const failures = [];
for (const check of checks) {
  const started = performance.now();
  try {
    const response = await fetch(new URL(check.path, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: check.authorization
        ? { Authorization: `Bearer ${monitorToken}` }
        : undefined,
    });
    const durationMs = Math.round(performance.now() - started);
    const passed = check.expected.includes(response.status);
    process.stdout.write(
      `${JSON.stringify({ event: "synthetic_check", check: check.name, passed, status: response.status, durationMs })}\n`,
    );
    if (!passed) failures.push(check.name);
  } catch {
    process.stdout.write(
      `${JSON.stringify({ event: "synthetic_check", check: check.name, passed: false, errorCode: "REQUEST_FAILED" })}\n`,
    );
    failures.push(check.name);
  }
}

if (failures.length > 0) {
  throw new Error(`Synthetic checks failed: ${failures.join(", ")}`);
}
