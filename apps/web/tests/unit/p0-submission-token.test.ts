import { describe, expect, it } from "vitest";
import {
  createSubmissionToken,
  hashSubmissionToken,
  isAuthorizedSubmissionCookie,
  matchesSubmissionTokenHash,
  verifySubmissionToken,
} from "../../lib/submissions/submission-token";

const secret = "test-only-submission-secret-that-is-long-enough";
const submissionId = "11111111-1111-1111-1111-111111111111";
const otherSubmissionId = "22222222-2222-2222-2222-222222222222";
const issuedAt = new Date("2026-08-28T12:00:00.000Z");

describe("P0-5 submission ownership token", () => {
  it("must not treat a cookie of ${id}.${anything} as authorized", () => {
    expect(
      isAuthorizedSubmissionCookie(
        `${submissionId}.forged-request-id`,
        submissionId,
        secret,
      ),
    ).toBe(false);
  });

  it("accepts an intact, unexpired token for the exact submission", () => {
    const { token } = createSubmissionToken({
      submissionId,
      secret,
      now: issuedAt,
      ttlSeconds: 300,
    });

    expect(
      verifySubmissionToken({
        token,
        submissionId,
        secret,
        now: new Date("2026-08-28T12:04:59.000Z"),
      }),
    ).toMatchObject({
      version: 1,
      submissionId,
      purpose: "submission-owner",
    });
  });

  it.each([
    ["wrong submission", otherSubmissionId, secret, new Date("2026-08-28T12:01:00Z")],
    ["wrong secret", submissionId, `${secret}-wrong`, new Date("2026-08-28T12:01:00Z")],
    ["expired", submissionId, secret, new Date("2026-08-28T12:05:00Z")],
  ])("rejects %s tokens", (_label, requestedId, candidateSecret, now) => {
    const { token } = createSubmissionToken({
      submissionId,
      secret,
      now: issuedAt,
      ttlSeconds: 300,
    });
    expect(
      verifySubmissionToken({
        token,
        submissionId: requestedId,
        secret: candidateSecret,
        now,
      }),
    ).toBeNull();
  });

  it("rejects malformed and tampered tokens without throwing", () => {
    const { token } = createSubmissionToken({ submissionId, secret, now: issuedAt });
    const [payload, signature] = token.split(".");

    expect(
      verifySubmissionToken({ token: "not-a-token", submissionId, secret }),
    ).toBeNull();
    expect(
      verifySubmissionToken({
        token: `${payload}x.${signature}`,
        submissionId,
        secret,
      }),
    ).toBeNull();
  });

  it("fails closed without a configured secret and hashes tokens deterministically", () => {
    const { token } = createSubmissionToken({ submissionId, secret, now: issuedAt });
    expect(isAuthorizedSubmissionCookie(token, submissionId)).toBe(false);
    expect(hashSubmissionToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSubmissionToken(token)).toBe(hashSubmissionToken(token));
    expect(matchesSubmissionTokenHash(token, hashSubmissionToken(token))).toBe(true);
    expect(matchesSubmissionTokenHash(`${token}x`, hashSubmissionToken(token))).toBe(
      false,
    );
  });
});
