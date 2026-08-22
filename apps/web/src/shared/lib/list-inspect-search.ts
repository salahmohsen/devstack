/** Drop one search key; keep the rest (q, filter, sort, …). */
export function omitSearchKey<T extends object>(search: T, key: keyof T): T {
  const next = { ...search };
  delete next[key];
  return next;
}

/**
 * Child effects run before RootLayout pathname `close()`. Defer open+strip
 * until after that flush so inspect is not immediately dismissed.
 */
export function scheduleAfterLayoutClose(fn: () => void): () => void {
  let cancelled = false;
  queueMicrotask(() => {
    if (cancelled) return;
    fn();
  });
  return () => {
    cancelled = true;
  };
}
