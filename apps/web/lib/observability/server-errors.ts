type ServerErrorRecord = {
  timestamp: string;
  level: "error";
  event: "server_request_error";
  requestId: string;
  route: string;
  method: string;
  errorCode: "UNHANDLED_SERVER_ERROR";
  digest?: string;
  environment: "development" | "preview" | "production" | "test" | "unknown";
  release?: string;
};

type ServerErrorInput = {
  requestId: string;
  route: string;
  method: string;
  error: unknown;
  now?: Date;
  environment?: string;
  release?: string;
};

const SAFE_VALUE = /[^a-zA-Z0-9_./:@-]/g;

function safeValue(value: string, fallback: string, maxLength: number): string {
  const sanitized = value.replace(SAFE_VALUE, "_").slice(0, maxLength);
  return sanitized || fallback;
}

function safeEnvironment(value: string | undefined): ServerErrorRecord["environment"] {
  if (value === "development" || value === "preview" || value === "production") {
    return value;
  }
  if (value === "test") return "test";
  return "unknown";
}

function errorDigest(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("digest" in error)) return undefined;
  const digest = String(error.digest);
  return safeValue(digest, "unknown", 100);
}

export function buildServerErrorRecord(input: ServerErrorInput): ServerErrorRecord {
  const digest = errorDigest(input.error);
  const release = input.release ? safeValue(input.release, "unknown", 80) : undefined;

  return {
    timestamp: (input.now ?? new Date()).toISOString(),
    level: "error",
    event: "server_request_error",
    requestId: safeValue(input.requestId, "unknown", 100),
    route: safeValue(input.route, "unknown", 200),
    method: safeValue(input.method.toUpperCase(), "UNKNOWN", 12),
    errorCode: "UNHANDLED_SERVER_ERROR",
    ...(digest ? { digest } : {}),
    environment: safeEnvironment(input.environment),
    ...(release ? { release } : {}),
  };
}

export function recordServerError(
  input: ServerErrorInput,
  write: (message: string) => void = console.error,
): void {
  write(JSON.stringify(buildServerErrorRecord(input)));
}
