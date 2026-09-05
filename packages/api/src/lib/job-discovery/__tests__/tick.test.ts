import { beforeEach, describe, expect, it, vi } from "vitest";

const { applicationRepository, applicationActivityRepository, userJobRepository, runSilenceTick } =
  vi.hoisted(() => {
    return {
      applicationRepository: {
        listInboxExpired: vi.fn(),
        setTrackingStatus: vi.fn()
      },
      applicationActivityRepository: { append: vi.fn() },
      userJobRepository: { purgeStale: vi.fn() },
      runSilenceTick: vi.fn()
    };
  });

vi.mock("@tsu-stack/db", () => {
  return {
    applicationRepository,
    applicationActivityRepository,
    userJobRepository
  };
});

vi.mock("#@/lib/application/silence-tick", () => {
  return { runSilenceTick };
});

import { runInboxTick } from "#@/lib/job-discovery/tick";

function inboxRow(overrides: Record<string, unknown>) {
  return {
    id: "app-1",
    userId: "u1",
    trackingStatus: "inbox",
    inboxExpiresAt: null,
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  applicationRepository.setTrackingStatus.mockResolvedValue(true);
});

describe("runInboxTick", () => {
  it("dismisses only rows whose inbox TTL has passed", async () => {
    const now = new Date("2026-09-05T12:00:00Z");
    applicationRepository.listInboxExpired.mockResolvedValue([
      inboxRow({ id: "app-expired", inboxExpiresAt: new Date("2026-09-04T00:00:00Z") }),
      inboxRow({ id: "app-future", inboxExpiresAt: new Date("2026-09-06T00:00:00Z") }),
      inboxRow({ id: "app-grandfathered", inboxExpiresAt: null })
    ]);

    const result = await runInboxTick(now);

    expect(applicationRepository.setTrackingStatus).toHaveBeenCalledTimes(1);
    expect(applicationRepository.setTrackingStatus).toHaveBeenCalledWith(
      "app-expired",
      "u1",
      "dismissed",
      "inbox"
    );
    expect(applicationActivityRepository.append).toHaveBeenCalledWith({
      userId: "u1",
      applicationId: "app-expired",
      kind: "dismissed",
      metadata: { via: "ttl" }
    });
    expect(result.dismissedExpired).toBe(1);
  });

  it("keeps counting when a dismissal loses the race", async () => {
    applicationRepository.listInboxExpired.mockResolvedValue([
      inboxRow({ inboxExpiresAt: new Date("2026-09-01T00:00:00Z") })
    ]);
    applicationRepository.setTrackingStatus.mockResolvedValue(false);

    const result = await runInboxTick(new Date("2026-09-05T12:00:00Z"));
    expect(result.dismissedExpired).toBe(0);
    expect(applicationActivityRepository.append).not.toHaveBeenCalled();
  });

  it("purges stale user_job rows with the 30d TTL cutoff", async () => {
    applicationRepository.listInboxExpired.mockResolvedValue([]);
    userJobRepository.purgeStale.mockResolvedValue(7);
    const now = new Date("2026-09-05T12:00:00Z");

    const result = await runInboxTick(now);

    expect(userJobRepository.purgeStale).toHaveBeenCalledTimes(1);
    const cutoff = userJobRepository.purgeStale.mock.calls[0][0] as Date;
    expect(cutoff.getTime()).toBe(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(result.purged).toBe(7);
  });

  it("runs the silence tick with the same now", async () => {
    applicationRepository.listInboxExpired.mockResolvedValue([]);
    userJobRepository.purgeStale.mockResolvedValue(0);
    const now = new Date("2026-09-05T12:00:00Z");

    await runInboxTick(now);

    expect(runSilenceTick).toHaveBeenCalledWith(now);
  });
});
