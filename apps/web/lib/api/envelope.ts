import { randomUUID } from "node:crypto";
import type { ApiFailure, ApiSuccess } from "@snackcheck/contracts";

export function requestId(): string {
  return randomUUID();
}

export function ok<T>(
  data: T,
  id = requestId(),
  cache?: "HIT" | "MISS" | "STALE",
): ApiSuccess<T> {
  return { data, meta: { requestId: id, cache } };
}

export function fail(
  code: string,
  message: string,
  options?: { retryable?: boolean; fieldErrors?: Record<string, string[]>; id?: string },
): ApiFailure {
  return {
    error: {
      code,
      message,
      retryable: options?.retryable ?? false,
      fieldErrors: options?.fieldErrors,
    },
    meta: { requestId: options?.id ?? requestId() },
  };
}
