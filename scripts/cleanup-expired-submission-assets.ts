import { createClient } from "@supabase/supabase-js";
import type { Database } from "@snackcheck/db-types";
import { cleanupExpiredSubmissionAssets } from "../apps/web/lib/operations/retention-cleanup";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error(
    "Retention cleanup requires Supabase URL and service-role credentials.",
  );
}

const apply = process.env.RETENTION_CLEANUP_APPLY === "true";
if (
  apply &&
  process.env.RETENTION_CLEANUP_CONFIRM !== "DELETE_EXPIRED_UNLINKED_TERMINAL_SUBMISSIONS"
) {
  throw new Error("Apply mode requires the exact retention cleanup confirmation phrase.");
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const result = await cleanupExpiredSubmissionAssets({
  admin,
  apply,
  batchSize: Number(process.env.RETENTION_CLEANUP_BATCH_SIZE ?? "50"),
});

process.stdout.write(`${JSON.stringify({ event: "retention_cleanup", ...result })}\n`);
if (result.failed > 0) process.exitCode = 1;
