import { afterEach, describe, expect, it } from "vitest";

import { claimFindJobsNowEnqueue, resetFindJobsNowClientForTests } from "./find-jobs-now-client";

describe("claimFindJobsNowEnqueue", () => {
  afterEach(() => {
    resetFindJobsNowClientForTests();
  });

  it("allows the first mount and blocks remount of the same tool call", () => {
    expect(claimFindJobsNowEnqueue("fn1")).toBe(true);
    expect(claimFindJobsNowEnqueue("fn1")).toBe(false);
    expect(claimFindJobsNowEnqueue("fn2")).toBe(true);
  });
});
