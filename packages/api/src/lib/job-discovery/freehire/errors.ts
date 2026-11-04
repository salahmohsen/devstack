export class FreehireError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs: number;
  constructor(message: string, retryable: boolean, retryAfterMs = 0, options?: ErrorOptions) {
    super(message, options);
    this.name = "FreehireError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

/** Only transport diagnostics; never headers, URLs with query strings or bodies. */
export function freehireNetworkCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: unknown; cause?: unknown; errors?: unknown[] };
  if (typeof value.code === "string") return value.code;
  return freehireNetworkCode(value.cause) ?? value.errors?.map(freehireNetworkCode).find(Boolean);
}

export function asFreehireError(error: unknown): FreehireError {
  if (error instanceof FreehireError) return error;
  const code = freehireNetworkCode(error);
  return new FreehireError(
    code ? `Job source connection failed (${code}).` : "Job source connection timed out or failed.",
    true,
    0,
    { cause: error }
  );
}
