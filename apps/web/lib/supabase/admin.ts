import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@snackcheck/db-types";
import { env } from "@/lib/env";

export function createAdminClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
