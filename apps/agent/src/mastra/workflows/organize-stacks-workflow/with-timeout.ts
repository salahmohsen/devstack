/**
 * Promise.race with a timeout that always clears the timer (success or failure).
 * Optional `onTimeout` should abort the underlying work (e.g. AbortController.abort).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = `LLM timeout after ${ms / 1000}s`,
  signal?: AbortSignal,
  onTimeout?: () => void
): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        onTimeout?.();
      } catch {
        // ignore abort errors
      }
      reject(new Error(message));
    }, ms);

    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}

/**
 * Run work with a linked AbortController: outer cancel + timeout both abort the work signal.
 */
export async function withTimeoutSignal<T>(
  run: (signal: AbortSignal) => Promise<T>,
  ms: number,
  message = `LLM timeout after ${ms / 1000}s`,
  outerSignal?: AbortSignal
): Promise<T> {
  const local = new AbortController();
  const onOuterAbort = () => local.abort();
  if (outerSignal?.aborted) {
    local.abort();
  } else {
    outerSignal?.addEventListener("abort", onOuterAbort, { once: true });
  }
  try {
    return await withTimeout(run(local.signal), ms, message, outerSignal, () => local.abort());
  } finally {
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}
