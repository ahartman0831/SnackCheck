/**
 * Intended check: HMAC (or equivalent signed token) over the submission id
 * using `SUBMISSION_TOKEN_SECRET`. A prefix of `${id}.` must not authorize.
 *
 * Phase 0 keeps the forgeable prefix helper so extract/confirm behavior is
 * unchanged and the P0-5 regression stays red until Phase 5.
 */
export function isAuthorizedSubmissionCookie(
  cookieValue: string,
  submissionId: string,
): boolean {
  return cookieValue.startsWith(`${submissionId}.`);
}
