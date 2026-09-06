import { describe, expect, it } from "vitest";

import { applyPreferenceHardFails } from "#@/job-preference/hard-fails";
import { defaultJobPreference } from "#@/job-preference/utils";

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
