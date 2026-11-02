import { describe, expect, it } from "vitest";

import { createRateLimiter } from "#@/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to max requests per window then reports when to retry", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect(limiter.check("u1", 0)).toEqual({ ok: true });
    expect(limiter.check("u1", 1_000)).toEqual({ ok: true });
    expect(limiter.check("u1", 2_000)).toEqual({ ok: true });
    expect(limiter.check("u1", 3_000)).toEqual({ ok: false, retryAfterMs: 57_000 });
  });

  it("reopens after the window even when the caller never went idle", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    limiter.check("u1", 0);
    limiter.check("u1", 30_000);
    expect(limiter.check("u1", 59_000).ok).toBe(false);
    expect(limiter.check("u1", 60_000)).toEqual({ ok: true });
  });

  it("counts each key separately", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.check("u1", 0).ok).toBe(true);
    expect(limiter.check("u2", 0).ok).toBe(true);
    expect(limiter.check("u1", 1).ok).toBe(false);
  });
});
