import { describe, expect, it } from "vitest";

import {
  applyHardJobPreferencePatch,
  applyPreferenceListPatch,
  applySoftJobPreferencePatch,
  describeHardPreferenceDelta,
  jobPreferencesEqual,
  PreferenceListPatchSchema,
  ProposeHardPreferenceChangeInputSchema,
  UpsertSoftJobPreferencesInputSchema
} from "#@/job-preference/list-patch";
import { defaultJobPreference } from "#@/job-preference/utils";

describe("PreferenceListPatchSchema", () => {
  it.each(["add", "remove", "set"] as const)("accepts op %s", (op) => {
    expect(PreferenceListPatchSchema.safeParse({ op, values: ["react"] }).success).toBe(true);
  });

  it("rejects unknown ops and empty tokens", () => {
    expect(PreferenceListPatchSchema.safeParse({ op: "merge", values: ["x"] }).success).toBe(false);
    expect(PreferenceListPatchSchema.safeParse({ op: "add", values: ["  "] }).success).toBe(false);
  });
});

describe("applyPreferenceListPatch", () => {
  it("add appends without replacing existing values", () => {
    expect(
      applyPreferenceListPatch(["React Native", "Java"], { op: "add", values: ["PHP"] })
    ).toEqual(["React Native", "Java", "PHP"]);
  });

  it("never treats a one-item add as a silent replace", () => {
    expect(applyPreferenceListPatch(["react", "node"], { op: "add", values: ["go"] })).toEqual([
      "react",
      "node",
      "go"
    ]);
  });

  it("add is case-insensitive and keeps first-seen casing", () => {
    expect(applyPreferenceListPatch(["PHP"], { op: "add", values: ["php", "Go"] })).toEqual([
      "PHP",
      "Go"
    ]);
  });

  it("remove drops matching tokens case-insensitively", () => {
    expect(
      applyPreferenceListPatch(["React Native", "PHP", "Java"], {
        op: "remove",
        values: ["php"]
      })
    ).toEqual(["React Native", "Java"]);
  });

  it("set replaces the whole list and dedupes", () => {
    expect(
      applyPreferenceListPatch(["old", "also"], { op: "set", values: ["eu", "EU", "mena"] })
    ).toEqual(["eu", "mena"]);
  });

  it("set with empty values clears the list", () => {
    expect(applyPreferenceListPatch(["eu"], { op: "set", values: [] })).toEqual([]);
  });

  it("add/remove with empty values leave current list", () => {
    expect(applyPreferenceListPatch(["eu"], { op: "add", values: [] })).toEqual(["eu"]);
    expect(applyPreferenceListPatch(["eu"], { op: "remove", values: [] })).toEqual(["eu"]);
  });

  it("caps at 50 values", () => {
    const current = Array.from({ length: 48 }, (_, i) => `k${i}`);
    const next = applyPreferenceListPatch(current, { op: "add", values: ["a", "b", "c"] });
    expect(next).toHaveLength(50);
    expect(next.at(-1)).toBe("b");
  });
});

describe("applySoftJobPreferencePatch", () => {
  it("applies role keyword deltas and workModes", () => {
    const current = {
      ...defaultJobPreference(),
      roleKeywords: ["react"]
    };
    const next = applySoftJobPreferencePatch(current, {
      workModes: ["remote"],
      roleKeywords: { op: "add", values: ["typescript"] }
    });
    expect(next.workModes).toEqual(["remote"]);
    expect(next.roleKeywords).toEqual(["react", "typescript"]);
  });

  it("does not touch hard-stop columns", () => {
    const current = {
      ...defaultJobPreference(),
      salaryMin: 4000,
      salaryCurrency: "USD"
    };
    const next = applySoftJobPreferencePatch(current, {
      roleKeywords: { op: "add", values: ["go"] }
    });
    expect(next.salaryMin).toBe(4000);
    expect(next.salaryCurrency).toBe("USD");
  });
});

describe("UpsertSoftJobPreferencesInputSchema", () => {
  it("rejects hard-stop keys", () => {
    expect(
      UpsertSoftJobPreferencesInputSchema.safeParse({
        roleKeywords: { op: "add", values: ["go"] },
        excludeKeywords: { op: "add", values: ["php"] }
      }).success
    ).toBe(false);
    expect(
      UpsertSoftJobPreferencesInputSchema.safeParse({
        salaryMin: 4000
      }).success
    ).toBe(false);
    expect(
      UpsertSoftJobPreferencesInputSchema.safeParse({
        levelFloor: "senior"
      }).success
    ).toBe(false);
  });

  it("accepts roleKeywords set (replace)", () => {
    expect(
      UpsertSoftJobPreferencesInputSchema.safeParse({
        roleKeywords: { op: "set", values: ["frontend"] }
      }).success
    ).toBe(true);
  });

  it("rejects an empty patch", () => {
    expect(UpsertSoftJobPreferencesInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("jobPreferencesEqual", () => {
  it("is true for identical bodies and false after a list change", () => {
    const base = defaultJobPreference();
    expect(jobPreferencesEqual(base, { ...base })).toBe(true);
    expect(
      jobPreferencesEqual(base, applySoftJobPreferencePatch(base, { workModes: ["remote"] }))
    ).toBe(false);
  });

  it("treats add of an existing keyword as a no-op", () => {
    const current = { ...defaultJobPreference(), roleKeywords: ["react"] };
    const next = applySoftJobPreferencePatch(current, {
      roleKeywords: { op: "add", values: ["React"] }
    });
    expect(jobPreferencesEqual(current, next)).toBe(true);
  });
});

describe("applyHardJobPreferencePatch + describeHardPreferenceDelta", () => {
  it("rejects dropped hard-stop fields", () => {
    expect(
      ProposeHardPreferenceChangeInputSchema.safeParse({
        excludeKeywords: { op: "add", values: ["php"] }
      }).success
    ).toBe(false);
    expect(
      ProposeHardPreferenceChangeInputSchema.safeParse({
        levelFloor: "senior"
      }).success
    ).toBe(false);
  });

  it("sets salary floor", () => {
    const current = defaultJobPreference();
    const patch = ProposeHardPreferenceChangeInputSchema.parse({
      salaryMin: 4000,
      salaryCurrency: "usd"
    });
    expect(applyHardJobPreferencePatch(current, patch)).toEqual({
      salaryMin: 4000,
      salaryCurrency: "USD"
    });
    const view = describeHardPreferenceDelta(current, patch);
    expect(view.summary).toMatch(/4000/);
    expect(view.summary).toMatch(/USD/);
    expect(view.chips).toContain("4000 USD");
  });
});
