import { z } from "zod";

export const ApiMetaSchema = z.object({
  requestId: z.string(),
  cache: z.enum(["HIT", "MISS", "STALE"]).optional(),
});
export type ApiMeta = z.infer<typeof ApiMetaSchema>;

export const ApiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
};

export type ApiFailure = {
  error: ApiErrorBody;
  meta: { requestId: string };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function isApiSuccess<T>(value: ApiResponse<T>): value is ApiSuccess<T> {
  return "data" in value;
}
