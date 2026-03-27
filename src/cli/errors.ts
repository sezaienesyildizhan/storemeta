export type StoremetaErrorCode =
  | "CONFIG_ERROR"
  | "AUTH_ERROR"
  | "VALIDATION_ERROR"
  | "API_ERROR"
  | "FILESYSTEM_ERROR";

export class StoremetaError extends Error {
  public readonly code: StoremetaErrorCode;
  public readonly cause?: unknown;

  public constructor(
    code: StoremetaErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "StoremetaError";
    this.code = code;
    this.cause = options?.cause;
  }
}
