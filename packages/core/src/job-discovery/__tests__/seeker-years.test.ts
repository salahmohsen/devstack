import { describe, expect, it } from "vitest";

import { mergeExperienceYears } from "#@/job-discovery/seeker-years";

describe("mergeExperienceYears", () => {
  it("returns null when no dated rows", () => {
    expect(mergeExperienceYears([], new Date("2026-08-20"))).toBeNull();
    expect(
      mergeExperienceYears([{ fromDate: null, toDate: null, isPresent: false }], new Date())
    ).toBeNull();
  });

  it("counts a single closed range in whole years", () => {
    expect(
      mergeExperienceYears(
        [{ fromDate: "2020-01-01", toDate: "2023-01-01", isPresent: false }],
        new Date("2026-08-20")
      )
    ).toBe(3);
  });

  it("uses now for present roles", () => {
    expect(
      mergeExperienceYears(
        [{ fromDate: "2024-08-20", toDate: null, isPresent: true }],
        new Date("2026-08-20")
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
        new Date("2026-08-20")
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
        new Date("2026-08-20")
      )
    ).toBe(1);
  });
});
