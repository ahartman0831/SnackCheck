import "server-only";
import { createHash } from "node:crypto";
import { AnalyticsEventSchema, type AnalyticsEvent } from "@snackcheck/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export function anonymousKeyHash(
  seed: string,
  day = new Date().toISOString().slice(0, 10),
): string {
  const secret = env.ANONYMOUS_KEY_HMAC_SECRET ?? "dev-only-anonymous-key";
  return createHash("sha256").update(`${secret}:${day}:${seed}`).digest("hex");
}

export async function recordEvent(
  event: AnalyticsEvent,
  seed = "anonymous",
): Promise<void> {
  try {
    const parsed = AnalyticsEventSchema.parse(event);
    const admin = createAdminClient();
    if (!admin) {
      return;
    }
    await admin.from("analytics_events").insert({
      anonymous_key_hash: anonymousKeyHash(seed),
      event_name: parsed.name,
      properties: parsed.properties,
    });
  } catch {
    // Analytics must never block a user result.
  }
}
