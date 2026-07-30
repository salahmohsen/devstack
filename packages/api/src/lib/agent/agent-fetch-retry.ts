/**
 * Retry policy for server → agent HTTP during deploys / brief overload.
 * Retries network failures and 502/503/504 only — never 4xx auth/validation.
 */

export type AgentFetchRetryOptions = {
  /** Total attempts including the first. Default 4 (3 retries). */
  attempts?: number;
  /** Initial delay before first retry. Default 400ms. */
  baseDelayMs?: number;
  /** Max delay between retries. Default 4s. */
  maxDelayMs?: number;
  /** Optional abort for the whole retry sequence. */
  signal?: AbortSignal;
};

const RETRY_STATUSES = new Set([502, 503, 504]);

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    // Timeout aborts are not retryable as a fresh attempt with same budget;
    // outer agentFetch already applied timeoutMs.
    return false;
  }
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound") ||
    msg.includes("socket") ||
    msg.includes("network")
  );
}

/**
 * Run `fn` with exponential backoff on retryable network errors or 502/503/504.
 * On non-retryable response, returns it immediately.
 * On exhausted retries, returns the last response or rethrows the last network error.
 */
export async function withAgentFetchRetry<T extends Response | null>(
  fn: () => Promise<T>,
  options: AgentFetchRetryOptions = {}
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 4);
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 4_000;
  const signal = options.signal;

  let lastError: unknown;
  let lastResponse: T | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const res = await fn();
      lastResponse = res;

      // null = AGENT_WORKER_URL unset — do not retry
      if (res == null) return res;

      if (res.ok || !RETRY_STATUSES.has(res.status) || attempt === attempts) {
        return res;
      }

      // Drain body so the connection can close before retry
      await res.text().catch(() => "");
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === attempts) {
        throw error;
      }
    }

    const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
    // jitter ±20%
    const jitter = delay * (0.8 + Math.random() * 0.4);
    await sleep(Math.round(jitter), signal);
  }

  if (lastResponse !== undefined) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function isAgentRetryableStatus(status: number): boolean {
  return RETRY_STATUSES.has(status);
}
