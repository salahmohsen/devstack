import { describe, expect, it } from "vitest";

import { defaultJobPreference, isOpenJobPreference } from "#@/job-preference/utils";

describe("isOpenJobPreference", () => {
  it("treats default empty filters as open", () => {
    expect(isOpenJobPreference(defaultJobPreference())).toBe(true);
  });

  it("is closed when role keywords are set", () => {
    expect(
      isOpenJobPreference({
        ...defaultJobPreference(),
        roleKeywords: ["react"]
      })
    ).toBe(false);
  });

  it("is closed when salary floor is set", () => {
    expect(
      isOpenJobPreference({
        ...defaultJobPreference(),
        salaryMin: 100_000
      })
    ).toBe(false);
  });
});
