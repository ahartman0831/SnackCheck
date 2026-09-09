import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("a new visitor can check ingredients without an invented passing result", async ({
  page,
}) => {
  await page.goto("/scan/ingredients");
  await page.getByLabel("Ingredient list").fill("oats, sugar, salt");
  const confirmation = page.waitForResponse((response) =>
    response.url().includes("/confirm"),
  );
  await page.getByRole("button", { name: "Check this list" }).click();
  expect((await confirmation).ok()).toBe(true);
  await expect(page.getByRole("button", { name: "Check this list" })).toBeEnabled();
  await expect(page.getByText("VERIFY", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Ingredient list")).toHaveValue("oats, sugar, salt");
  await page.reload();
  await expect(page.getByLabel("Ingredient list")).toHaveValue("oats, sugar, salt");
});

test("unowned submissions and admin writes reject unauthenticated requests", async ({
  request,
}) => {
  const submission = await request.get(
    "/api/v1/submissions/11111111-1111-4111-8111-111111111111",
  );
  expect(submission.status()).toBe(403);
  const admin = await request.post("/api/admin/rulesets/publish", { data: {} });
  expect([401, 403]).toContain(admin.status());
});

test("malformed pagination is rejected without a fake empty search", async ({
  request,
}) => {
  const result = await request.get("/api/v1/search?q=oats&offset=NaN");
  expect(result.status()).toBe(400);
  expect((await result.json()).error.code).toBe("INVALID_QUERY");
});

test("a returning reviewer refreshes an expired session and can sign out", async ({
  page,
  request,
  baseURL,
}) => {
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const email = `takeover-${randomUUID()}@example.test`;
  const password = randomUUID() + randomUUID();
  const headers = { apikey: service, Authorization: `Bearer ${service}` };
  const created = await request.post(`${api}/auth/v1/admin/users`, {
    headers,
    data: { email, password, email_confirm: true },
  });
  expect(created.ok()).toBe(true);
  const user = await created.json();
  try {
    const role = await request.post(`${api}/rest/v1/admin_members`, {
      headers,
      data: { user_id: user.id, role: "REVIEWER", active: true },
    });
    expect(role.ok()).toBe(true);
    const signed = await request.post(`${api}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anon },
      data: { email, password },
    });
    expect(signed.ok()).toBe(true);
    const session = await signed.json();
    // The expired access token is never trusted: Supabase must exchange the real
    // refresh token before either rendering data or persisting a new cookie.
    const parts = session.access_token.split(".");
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    claims.exp = Math.floor(Date.now() / 1000) - 60;
    parts[1] = Buffer.from(JSON.stringify(claims)).toString("base64url");
    // The signature may remain stale: the only acceptable path is server refresh.
    session.access_token = parts.join(".");
    session.expires_at = claims.exp;
    const name = `sb-${new URL(api).hostname.split(".")[0]}-auth-token`;
    const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
    await page.context().addCookies([{ name, value, url: baseURL! }]);
    await page.goto("/admin");
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Operations dashboard" }),
    ).toBeVisible();
    const refreshed = (await page.context().cookies()).find(
      (cookie) => cookie.name === name,
    );
    expect(Boolean(refreshed && refreshed.value !== value)).toBe(true);
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Admin access required" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Queue summary" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /sign out/i })).toHaveCount(0);
  } finally {
    await request.delete(`${api}/rest/v1/admin_members?user_id=eq.${user.id}`, {
      headers,
    });
    await request.delete(`${api}/auth/v1/admin/users/${user.id}`, { headers });
  }
});
