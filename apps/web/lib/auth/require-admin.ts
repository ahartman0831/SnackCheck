import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserServerClient } from "@/lib/supabase/server";
import type { AdminRole } from "@snackcheck/contracts";

export async function requireAdmin(roles?: AdminRole[]) {
  const userClient = await createUserServerClient();
  const user = userClient ? (await userClient.auth.getUser()).data.user : null;
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
