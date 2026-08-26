export class AppError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; status?: number },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.status = options?.status ?? 400;
  }
}
