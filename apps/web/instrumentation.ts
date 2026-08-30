import type { Instrumentation } from "next";
import { recordServerError } from "@/lib/observability/server-errors";

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  recordServerError({
    requestId: crypto.randomUUID(),
    route: context.routePath,
    method: request.method,
    error,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
};
