import { describe, expect, it } from "vitest";

import { LIVENESS_AFTER_MS } from "#@/job-discovery/constants";
import { inboxLivenessDueAt, isInboxExpired } from "#@/job-discovery/ttl";

describe("isInboxExpired", () => {
  it("grandfathers null inboxExpiresAt", () => {
    expect(isInboxExpired({ inboxExpiresAt: null, now: new Date() })).toBe(false);
  });
  it("expires when now >= inboxExpiresAt", () => {
    expect(
      isInboxExpired({ inboxExpiresAt: new Date("2026-01-01"), now: new Date("2026-01-08") })
    ).toBe(true);
  });
  it("does not expire before inboxExpiresAt", () => {
    expect(
      isInboxExpired({ inboxExpiresAt: new Date("2026-01-08"), now: new Date("2026-01-01") })
    ).toBe(false);
  });
  it("expires when now equals inboxExpiresAt", () => {
    const at = new Date("2026-01-08T00:00:00.000Z");
    expect(isInboxExpired({ inboxExpiresAt: at, now: at })).toBe(true);
  });
});

describe("inboxLivenessDueAt", () => {
  it("is createdAt plus LIVENESS_AFTER_MS", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    expect(inboxLivenessDueAt(createdAt).getTime()).toBe(createdAt.getTime() + LIVENESS_AFTER_MS);
  });
});
