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
  it("applies list deltas and set-only workModes/title", () => {
    const current = {
      ...defaultJobPreference(),
      roleKeywords: ["react"],
      locations: ["Cairo"],
      remoteRegions: ["mena"]
    };
    const next = applySoftJobPreferencePatch(current, {
      titleId: "frontend",
      workModes: ["remote"],
      roleKeywords: { op: "add", values: ["typescript"] },
      remoteRegions: { op: "set", values: ["eu"] }
    });
    expect(next.titleId).toBe("frontend");
    expect(next.workModes).toEqual(["remote"]);
    expect(next.roleKeywords).toEqual(["react", "typescript"]);
    expect(next.remoteRegions).toEqual(["eu"]);
    expect(next.locations).toEqual(["Cairo"]);
  });

  it("does not touch hard-stop columns", () => {
    const current = {
      ...defaultJobPreference(),
      excludeKeywords: ["php"],
      salaryMin: 4000,
      salaryCurrency: "USD",
      levelFloor: "senior" as const
    };
    const next = applySoftJobPreferencePatch(current, {
      roleKeywords: { op: "add", values: ["go"] }
    });
    expect(next.excludeKeywords).toEqual(["php"]);
    expect(next.salaryMin).toBe(4000);
    expect(next.salaryCurrency).toBe("USD");
    expect(next.levelFloor).toBe("senior");
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

  it("accepts remoteRegions set (replace)", () => {
    expect(
      UpsertSoftJobPreferencesInputSchema.safeParse({
        remoteRegions: { op: "set", values: ["eu"] }
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
  it("merges exclude add and keeps existing", () => {
    const current = {
      ...defaultJobPreference(),
      excludeKeywords: ["React Native"]
    };
    const patch = ProposeHardPreferenceChangeInputSchema.parse({
      excludeKeywords: { op: "add", values: ["PHP"] }
    });
    expect(applyHardJobPreferencePatch(current, patch)).toEqual({
      excludeKeywords: ["React Native", "PHP"]
    });
    const view = describeHardPreferenceDelta(current, patch);
    expect(view.summary).toMatch(/Add exclude:\s*PHP/i);
    expect(view.summary).toMatch(/React Native/);
    expect(view.chips).toContain("PHP");
  });

  it("sets salary floor and level floor", () => {
    const current = defaultJobPreference();
    const patch = ProposeHardPreferenceChangeInputSchema.parse({
      salaryMin: 4000,
      salaryCurrency: "usd",
      levelFloor: "senior"
    });
    expect(applyHardJobPreferencePatch(current, patch)).toEqual({
      salaryMin: 4000,
      salaryCurrency: "USD",
      levelFloor: "senior"
    });
    const view = describeHardPreferenceDelta(current, patch);
    expect(view.summary).toMatch(/4000/);
    expect(view.summary).toMatch(/USD/);
    expect(view.summary).toMatch(/senior/i);
  });
});
