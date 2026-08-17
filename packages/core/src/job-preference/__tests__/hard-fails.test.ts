import { describe, expect, it } from "vitest";

import { applyPreferenceHardFails } from "#@/job-preference/hard-fails";
import { defaultJobPreference } from "#@/job-preference/utils";

const rnJob = {
  title: "Senior React Native Engineer",
  companyName: "Acme",
  location: "Remote",
  description: null
};

describe("applyPreferenceHardFails exclude", () => {
  it("kills Senior React Native Engineer when exclude is react native", () => {
    const r = applyPreferenceHardFails(rnJob, {
      ...defaultJobPreference(),
      excludeKeywords: ["react native"]
    });
    expect(r.failed).toBe(true);
    expect(r.reasons).toContain("excluded keyword match");
  });

  it("does not kill Senior React Native Engineer when exclude is react", () => {
    const r = applyPreferenceHardFails(rnJob, {
      ...defaultJobPreference(),
      excludeKeywords: ["react"]
    });
    expect(r.failed).toBe(false);
  });
});

describe("applyPreferenceHardFails level floor", () => {
  it("does not kill when the floor is unset or seniority is unknown", () => {
    expect(
      applyPreferenceHardFails(
        { title: "Junior Engineer" },
        { ...defaultJobPreference(), levelFloor: null }
      ).failed
    ).toBe(false);
    expect(
      applyPreferenceHardFails(
        { title: "Software Engineer" },
        { ...defaultJobPreference(), levelFloor: "senior" }
      ).failed
    ).toBe(false);
  });

  it("kills a known title below the floor and passes senior/staff", () => {
    const floor = { ...defaultJobPreference(), levelFloor: "senior" as const };
    expect(applyPreferenceHardFails({ title: "Junior Engineer" }, floor).failed).toBe(true);
    expect(applyPreferenceHardFails({ title: "Mid Engineer" }, floor).failed).toBe(true);
    expect(applyPreferenceHardFails({ title: "Senior Engineer" }, floor).failed).toBe(false);
    expect(applyPreferenceHardFails({ title: "Staff Engineer" }, floor).failed).toBe(false);
  });
});

describe("applyPreferenceHardFails salary floor", () => {
  const floor = { ...defaultJobPreference(), salaryMin: 4_000, salaryCurrency: "USD" };

  it("does not kill unknown pay or unstructured amount under 15_000", () => {
    expect(applyPreferenceHardFails({ title: "Engineer" }, floor).failed).toBe(false);
    expect(
      applyPreferenceHardFails(
        { title: "Engineer", salaryMin: 8_000, salaryCurrency: "USD" },
        floor
      ).failed
    ).toBe(false);
  });

  it("kills explicit monthly pay below the floor", () => {
    const r = applyPreferenceHardFails({ title: "Engineer", salaryRange: "2000 USD/mo" }, floor);
    expect(r.failed).toBe(true);
    expect(r.reasons).toContain("below salary floor");
  });

  it("does not kill currency mismatch", () => {
    expect(
      applyPreferenceHardFails({ title: "Engineer", salaryRange: "2000 EUR/mo" }, floor).failed
    ).toBe(false);
  });

  it("preview: same-currency monthly below floor is a kill when extract pay is present", () => {
    const r = applyPreferenceHardFails(
      {
        title: "Engineer",
        salaryMin: 2_000,
        salaryCurrency: "USD",
        salaryPeriod: "month"
      },
      floor
    );
    expect(r.failed).toBe(true);
    expect(r.reasons).toContain("below salary floor");
  });
});
