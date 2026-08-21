import { describe, expect, it } from "vitest";

import { mergeExperienceYears } from "#@/job-discovery/seeker-years";

const now = new Date(2026, 7, 20);

describe("mergeExperienceYears", () => {
  it("returns null when no dated rows", () => {
    expect(mergeExperienceYears([], now)).toBeNull();
    expect(
      mergeExperienceYears([{ fromDate: null, toDate: null, isPresent: false }], now)
    ).toBeNull();
  });

  it("skips closed rows with no toDate", () => {
    expect(
      mergeExperienceYears([{ fromDate: "2020-01-01", toDate: null, isPresent: false }], now)
    ).toBeNull();
  });

  it("counts a single closed range in whole years", () => {
    expect(
      mergeExperienceYears(
        [{ fromDate: "2020-01-01", toDate: "2023-01-01", isPresent: false }],
        now
      )
    ).toBe(3);
  });

  it("uses now for present roles", () => {
    expect(
      mergeExperienceYears([{ fromDate: "2024-08-20", toDate: null, isPresent: true }], now)
    ).toBe(2);
  });

  it("counts whole calendar years when now has a time component", () => {
    expect(
      mergeExperienceYears(
        [{ fromDate: "2024-08-20", toDate: null, isPresent: true }],
        new Date(2026, 7, 20, 15, 0, 0)
      )
    ).toBe(2);
    expect(
      mergeExperienceYears(
        [{ fromDate: "2024-08-20", toDate: "2026-08-20", isPresent: false }],
        new Date(2026, 7, 20, 15, 0, 0)
      )
    ).toBe(2);
  });

  it("merges overlapping ranges once", () => {
    expect(
      mergeExperienceYears(
        [
          { fromDate: "2020-01-01", toDate: "2023-01-01", isPresent: false },
          { fromDate: "2022-01-01", toDate: "2024-01-01", isPresent: false }
        ],
        now
      )
    ).toBe(4);
  });

  it("ignores undated rows among dated ones", () => {
    expect(
      mergeExperienceYears(
        [
          { fromDate: null, toDate: null, isPresent: false },
          { fromDate: "2021-01-01", toDate: "2022-01-01", isPresent: false }
        ],
        now
      )
    ).toBe(1);
  });
});
