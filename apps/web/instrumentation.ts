import type { Instrumentation } from "next";
import {
  buildServerErrorRecord,
  writeServerErrorRecord,
} from "@/lib/observability/server-errors";
import {
  registerErrorMonitoring,
  reportServerError,
} from "@/lib/observability/error-monitoring";

export async function register() {
  await registerErrorMonitoring();
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const record = buildServerErrorRecord({
    requestId: crypto.randomUUID(),
    route: context.routePath,
    method: request.method,
    error,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  writeServerErrorRecord(record);
  await reportServerError(record);
};
