export type RateLimitDecision = { ok: true } | { ok: false; retryAfterMs: number };

export type RateLimiter = {
  check(key: string, now?: number): RateLimitDecision;
};

/**
 * Fixed-window counter per key, held in this process. A window opens on the first
 * request and closes after `windowMs` no matter how busy the caller stays, so a
 * steady stream never locks itself out the way an idle-reset counter does.
 */
export function createRateLimiter(options: { windowMs: number; max: number }): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    check(key, now = Date.now()) {
      const current = windows.get(key);
      if (!current || now - current.start >= options.windowMs) {
        windows.set(key, { start: now, count: 1 });
        if (windows.size > 10_000) {
          for (const [k, w] of windows) {
            if (now - w.start >= options.windowMs) windows.delete(k);
          }
        }
        return { ok: true };
      }
      if (current.count >= options.max) {
        return { ok: false, retryAfterMs: options.windowMs - (now - current.start) };
      }
      current.count += 1;
      return { ok: true };
    }
  };
}
