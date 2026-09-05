import { describe, expect, it } from "vitest";

import { DISCOVERY_FETCH_POOL_SIZE } from "#@/job-discovery/constants";
import { computeLandBudget, inboxKeeperInsertAllowed } from "#@/job-discovery/land-budget";

describe("computeLandBudget", () => {
  it("stops at 50 open including pending", () => {
    expect(
      computeLandBudget({
        poolSize: DISCOVERY_FETCH_POOL_SIZE,
        openInbox: 50,
        inboxThisRun: 0,
        remainingDailyAiAttempts: 50,
        hasAiKey: true
      })
    ).toBe(0);
  });

  it("ignores AI budget when there is no key", () => {
    expect(
      computeLandBudget({
        poolSize: DISCOVERY_FETCH_POOL_SIZE,
        openInbox: 10,
        inboxThisRun: 0,
        remainingDailyAiAttempts: 0,
        hasAiKey: false
      })
    ).toBe(40);
  });

  it("refuses inbox insert when the re-check sees 50 open inbox", () => {
    expect(
      inboxKeeperInsertAllowed({
        openInbox: 50,
        inboxThisRun: 0,
        poolSize: DISCOVERY_FETCH_POOL_SIZE
      })
    ).toBe(false);
    expect(
      inboxKeeperInsertAllowed({
        openInbox: 49,
        inboxThisRun: 0,
        poolSize: DISCOVERY_FETCH_POOL_SIZE
      })
    ).toBe(true);
    expect(
      inboxKeeperInsertAllowed({
        openInbox: 10,
        inboxThisRun: DISCOVERY_FETCH_POOL_SIZE,
        poolSize: DISCOVERY_FETCH_POOL_SIZE
      })
    ).toBe(false);
  });

  it("does not over-land pending stubs past the pool size", () => {
    expect(
      computeLandBudget({
        poolSize: DISCOVERY_FETCH_POOL_SIZE,
        openInbox: 10,
        inboxThisRun: 20,
        remainingDailyAiAttempts: 50,
        hasAiKey: true
      })
    ).toBe(40);
  });
});
