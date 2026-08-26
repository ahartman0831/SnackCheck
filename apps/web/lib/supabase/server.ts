import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@snackcheck/db-types";
import { env } from "@/lib/env";

export async function createUserServerClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  const store = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>,
        ) {
          for (const cookie of cookiesToSet) {
            store.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );
}
