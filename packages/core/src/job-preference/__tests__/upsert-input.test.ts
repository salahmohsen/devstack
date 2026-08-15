import { describe, expect, it } from "vitest";

import { UpsertJobPreferenceInputSchema } from "#@/job-preference/types";

describe("UpsertJobPreferenceInputSchema custom title", () => {
  it("rejects custom title without two keywords", () => {
    const parsed = UpsertJobPreferenceInputSchema.safeParse({
      titleId: "custom",
      customTitle: "SRE",
      roleKeywords: ["k8s"]
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects custom title with an empty name", () => {
    const parsed = UpsertJobPreferenceInputSchema.safeParse({
      titleId: "custom",
      customTitle: "   ",
      roleKeywords: ["sre", "kubernetes"]
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts custom title with name and two keywords", () => {
    const parsed = UpsertJobPreferenceInputSchema.safeParse({
      titleId: "custom",
      customTitle: "SRE",
      roleKeywords: ["sre", "kubernetes"]
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a pack title without extras", () => {
    const parsed = UpsertJobPreferenceInputSchema.safeParse({
      titleId: "frontend"
    });
    expect(parsed.success).toBe(true);
  });

  it("does not require custom fields when titleId is omitted", () => {
    const parsed = UpsertJobPreferenceInputSchema.safeParse({
      jobsPerRun: 20,
      importFromEmail: true
    });
    expect(parsed.success).toBe(true);
  });
});
