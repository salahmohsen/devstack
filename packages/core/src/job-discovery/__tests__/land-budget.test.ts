import { describe, expect, it } from "vitest";

import { computeLandBudget } from "#@/job-discovery/land-budget";

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
