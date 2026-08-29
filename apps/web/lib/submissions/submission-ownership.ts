import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import {
  matchesSubmissionTokenHash,
  verifySubmissionToken,
} from "@/lib/submissions/submission-token";

type OwnershipRecord = {
  anonymous_key_hash: string | null;
  token_version: number;
  token_expires_at: string | null;
  ownership_revoked_at: string | null;
};

export async function ownsSubmission(
  token: string,
  submissionId: string,
): Promise<boolean> {
  const verified = verifySubmissionToken({
    token,
    submissionId,
    secret: env.SUBMISSION_TOKEN_SECRET,
  });
  if (!verified) return false;

  const admin = createAdminClient();
  if (!admin) return false;

  const { data, error } = await admin
    .from("submissions")
    .select("anonymous_key_hash, token_version, token_expires_at, ownership_revoked_at")
    .eq("id", submissionId)
    .maybeSingle();
  const ownership = data as unknown as OwnershipRecord | null;

  if (
    error ||
    !ownership ||
    ownership.ownership_revoked_at ||
    ownership.token_version !== verified.version ||
    !ownership.token_expires_at ||
    new Date(ownership.token_expires_at).getTime() <= Date.now()
  ) {
    return false;
  }

  return matchesSubmissionTokenHash(token, ownership.anonymous_key_hash);
}
