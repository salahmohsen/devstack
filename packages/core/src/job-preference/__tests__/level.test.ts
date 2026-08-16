import { describe, expect, it } from "vitest";

import { inferTitleSeniority } from "#@/job-preference/level";

describe("inferTitleSeniority §6.4", () => {
  it.each([
    ["Software Intern", "junior"],
    ["Junior Engineer", "junior"],
    ["Jr Developer", "junior"],
    ["Associate Engineer", "junior"],
    ["Mid Engineer", "mid"],
    ["Mid-level Engineer", "mid"],
    ["Midlevel Engineer", "mid"],
    ["Senior Engineer", "senior"],
    ["Sr Engineer", "senior"],
    ["Staff Engineer", "staff"],
    ["Principal Engineer", "staff"],
    ["Distinguished Engineer", "staff"],
    ["Engineering Lead", null],
    ["Software Engineer", null]
  ] as const)("%s → %s", (title, expected) => {
    expect(inferTitleSeniority(title)).toBe(expected);
  });

  it("takes the highest rank when a title has two ranks", () => {
    expect(inferTitleSeniority("Senior Intern")).toBe("senior");
    expect(inferTitleSeniority("Junior Staff Engineer")).toBe("staff");
  });
});
