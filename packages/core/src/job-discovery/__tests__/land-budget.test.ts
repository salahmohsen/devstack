import { describe, expect, it } from "vitest";

import { computeLandBudget, inboxKeeperInsertAllowed } from "#@/job-discovery/land-budget";

describe("computeLandBudget", () => {
  it("stops at 50 open including pending", () => {
    expect(
      computeLandBudget({
        jobsPerRun: 25,
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
        jobsPerRun: 25,
        openInbox: 10,
        inboxThisRun: 0,
        remainingDailyAiAttempts: 0,
        hasAiKey: false
      })
    ).toBe(25);
  });

  it("refuses inbox insert when the re-check sees 50 open inbox", () => {
    expect(inboxKeeperInsertAllowed({ openInbox: 50, inboxThisRun: 0, jobsPerRun: 25 })).toBe(
      false
    );
    expect(inboxKeeperInsertAllowed({ openInbox: 49, inboxThisRun: 0, jobsPerRun: 25 })).toBe(true);
    expect(inboxKeeperInsertAllowed({ openInbox: 10, inboxThisRun: 25, jobsPerRun: 25 })).toBe(
      false
    );
  });

  it("does not over-land pending stubs past N", () => {
    expect(
      computeLandBudget({
        jobsPerRun: 25,
        openInbox: 10,
        inboxThisRun: 20,
        remainingDailyAiAttempts: 50,
        hasAiKey: true
      })
    ).toBe(5);
  });
});
