import { describe, expect, it } from "vitest";

import { resolveMatchLandDecision } from "#@/job-discovery/land-match";

describe("resolveMatchLandDecision", () => {
  it("passes from score vs min even when the model set passed false", () => {
    expect(resolveMatchLandDecision({ minScore: 85, aiScore: 100 })).toEqual({
      score: 100,
      passed: true
    });
  });

  it("fails when the score is below the hunt min, for any min", () => {
    expect(resolveMatchLandDecision({ minScore: 60, aiScore: 42 }).passed).toBe(false);
    expect(resolveMatchLandDecision({ minScore: 85, aiScore: 82 }).passed).toBe(false);
  });

  it("clamps the stored score", () => {
    expect(resolveMatchLandDecision({ minScore: 0, aiScore: 140 }).score).toBe(100);
    expect(resolveMatchLandDecision({ minScore: 0, aiScore: -3 }).score).toBe(0);
  });

  it("pass-all open prefs still keep a low score as passed", () => {
    expect(resolveMatchLandDecision({ minScore: 85, aiScore: 20, passAll: true })).toEqual({
      score: 20,
      passed: true
    });
  });
});
