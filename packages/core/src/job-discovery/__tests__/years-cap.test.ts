import { describe, expect, it } from "vitest";

import { applyYearsCap, YEARS_SCORE_CEILING } from "#@/job-discovery/years-cap";

describe("applyYearsCap", () => {
  it("does not cap when listing or seeker years are missing", () => {
    expect(applyYearsCap({ aiScore: 82, listingMinYears: 8, seekerYears: null })).toEqual({
      landScore: 82,
      displayScore: 82,
      capped: false
    });
    expect(applyYearsCap({ aiScore: 82, listingMinYears: null, seekerYears: 3 })).toEqual({
      landScore: 82,
      displayScore: 82,
      capped: false
    });
  });

  it("does not cap when seeker years meet the listing", () => {
    expect(applyYearsCap({ aiScore: 82, listingMinYears: 3, seekerYears: 5 })).toEqual({
      landScore: 82,
      displayScore: 82,
      capped: false
    });
    expect(applyYearsCap({ aiScore: 82, listingMinYears: 5, seekerYears: 5 })).toEqual({
      landScore: 82,
      displayScore: 82,
      capped: false
    });
  });

  it("uses a display ceiling of 65", () => {
    expect(YEARS_SCORE_CEILING).toBe(65);
  });

  it("caps display only when listing years exceed seeker years", () => {
    expect(applyYearsCap({ aiScore: 82, listingMinYears: 8, seekerYears: 3 })).toEqual({
      landScore: 82,
      displayScore: YEARS_SCORE_CEILING,
      capped: true
    });
  });

  it("does not raise a score already below the ceiling", () => {
    expect(applyYearsCap({ aiScore: 40, listingMinYears: 8, seekerYears: 3 })).toEqual({
      landScore: 40,
      displayScore: 40,
      capped: true
    });
  });
});
