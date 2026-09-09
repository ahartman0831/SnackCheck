import "server-only";
import { createHmac } from "node:crypto";
import { AnalyticsEventSchema, type AnalyticsEvent } from "@snackcheck/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export function anonymousKeyHash(
  seed: string,
  day = new Date().toISOString().slice(0, 10),
): string {
  const secret = env.ANONYMOUS_KEY_HMAC_SECRET ?? "dev-only-anonymous-key";
  if (env.NODE_ENV === "production" && !env.ANONYMOUS_KEY_HMAC_SECRET) {
    throw new Error("Production analytics requires its own HMAC secret.");
  }
  return createHmac("sha256", secret).update(`${day}:${seed}`).digest("hex");
}

export async function recordEvent(
  event: AnalyticsEvent,
  seed = "anonymous",
): Promise<boolean> {
  try {
    const parsed = AnalyticsEventSchema.parse(event);
    const admin = createAdminClient();
    if (!admin) {
      return false;
    }
    const { error } = await admin.from("analytics_events").insert({
      anonymous_key_hash: anonymousKeyHash(seed),
      event_name: parsed.name,
      properties: parsed.properties,
    });
    return !error;
  } catch {
    // Analytics must never block a user result.
    return false;
  }
}
