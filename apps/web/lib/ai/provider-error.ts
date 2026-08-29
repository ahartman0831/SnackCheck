import type { ExtractionFailureCode } from "./contracts";

export class ExtractionProviderError extends Error {
  constructor(readonly failureCode: ExtractionFailureCode) {
    super("The extraction provider rejected the request.");
    this.name = "ExtractionProviderError";
  }
}

export function classifyProviderHttpStatus(status: number): ExtractionFailureCode {
  if (status === 401 || status === 403) return "PROVIDER_AUTH";
  if (status === 400 || status === 404 || status === 422) {
    return "PROVIDER_REQUEST_INVALID";
  }
  if (status === 429) return "PROVIDER_RATE_LIMITED";
  return "PROVIDER_ERROR";
}
