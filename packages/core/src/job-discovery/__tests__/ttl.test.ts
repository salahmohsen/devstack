import { describe, expect, it } from "vitest";

import { isInboxExpired } from "#@/job-discovery/ttl";

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
