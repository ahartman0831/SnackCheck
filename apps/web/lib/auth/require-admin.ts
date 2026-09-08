import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { AdminRole } from "@snackcheck/contracts";

async function authorizeAdminUser(user: { id: string } | null, roles?: AdminRole[]) {
  if (!user) {
    return { user: null, role: null, allowed: false };
  }
  const admin = createAdminClient();
  if (!admin) {
    return { user, role: null, allowed: false };
  }
  const { data } = await admin
    .from("admin_members")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data?.active) {
    return { user, role: null, allowed: false };
  }
  const allowed = !roles || roles.includes(data.role);
  return { user, role: data.role, allowed };
}

export async function requireAdmin(roles?: AdminRole[]) {
  const userClient = await createUserServerClient();
  const user = userClient ? (await userClient.auth.getUser()).data.user : null;
  return authorizeAdminUser(user, roles);
}

export async function requireAdminFromRequest(request: Request, roles?: AdminRole[]) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return requireAdmin(roles);
  const token = authorization.slice("Bearer ".length).trim();
  if (
    !token ||
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return { user: null, role: null, allowed: false };
  }
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const user = (await client.auth.getUser(token)).data.user;
  return authorizeAdminUser(user, roles);
}
