import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = 1;
const TOKEN_PURPOSE = "submission-owner";
const DEFAULT_TTL_SECONDS = 60 * 60;
const MIN_SECRET_BYTES = 32;

type SubmissionTokenPayload = {
  version: number;
  submissionId: string;
  purpose: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

type CreateSubmissionTokenOptions = {
  submissionId: string;
  secret: string;
  now?: Date;
  ttlSeconds?: number;
};

type VerifySubmissionTokenOptions = {
  token: string;
  submissionId: string;
  secret: string | undefined;
  now?: Date;
};

export type VerifiedSubmissionToken = Readonly<SubmissionTokenPayload>;

function assertStrongSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) {
    throw new Error(
      `SUBMISSION_TOKEN_SECRET must be at least ${MIN_SECRET_BYTES} bytes.`,
    );
  }
}

function sign(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload).digest();
}

function isPayload(value: unknown): value is SubmissionTokenPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.version === TOKEN_VERSION &&
    typeof payload.submissionId === "string" &&
    payload.purpose === TOKEN_PURPOSE &&
    Number.isSafeInteger(payload.issuedAt) &&
    Number.isSafeInteger(payload.expiresAt) &&
    typeof payload.nonce === "string" &&
    payload.nonce.length >= 22
  );
}

export function createSubmissionToken({
  submissionId,
  secret,
  now = new Date(),
  ttlSeconds = DEFAULT_TTL_SECONDS,
}: CreateSubmissionTokenOptions): {
  token: string;
  payload: VerifiedSubmissionToken;
} {
  assertStrongSecret(secret);
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("Submission token TTL must be a positive integer.");
  }

  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: SubmissionTokenPayload = {
    version: TOKEN_VERSION,
    submissionId,
    purpose: TOKEN_PURPOSE,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
    nonce: randomBytes(24).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(encodedPayload, secret).toString("base64url");

  return { token: `${encodedPayload}.${signature}`, payload };
}

export function verifySubmissionToken({
  token,
  submissionId,
  secret,
  now = new Date(),
}: VerifySubmissionTokenOptions): VerifiedSubmissionToken | null {
  if (!secret || Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) return null;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  try {
    const providedSignature = Buffer.from(parts[1], "base64url");
    const expectedSignature = sign(parts[0], secret);
    if (
      providedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(providedSignature, expectedSignature)
    ) {
      return null;
    }

    const decoded = Buffer.from(parts[0], "base64url").toString("utf8");
    const payload: unknown = JSON.parse(decoded);
    if (!isPayload(payload)) return null;

    const nowSeconds = Math.floor(now.getTime() / 1000);
    if (
      payload.submissionId !== submissionId ||
      payload.issuedAt > nowSeconds + 30 ||
      payload.expiresAt <= nowSeconds ||
      payload.expiresAt <= payload.issuedAt
    ) {
      return null;
    }

    return Object.freeze(payload);
  } catch {
    return null;
  }
}

export function hashSubmissionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function matchesSubmissionTokenHash(
  token: string,
  expectedHash: string | null | undefined,
): boolean {
  if (!expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual = Buffer.from(hashSubmissionToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isAuthorizedSubmissionCookie(
  cookieValue: string,
  submissionId: string,
  secret?: string,
  now?: Date,
): boolean {
  return Boolean(
    verifySubmissionToken({ token: cookieValue, submissionId, secret, now }),
  );
}
