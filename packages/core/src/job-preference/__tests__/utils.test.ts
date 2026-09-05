import { describe, expect, it } from "vitest";

import { UpsertJobPreferenceInputSchema } from "#@/job-preference/types";
import {
  backfillRemoteRegionsFromLocations,
  buildSeekerMatchEvidence,
  defaultJobPreference,
  emptySeekerMatchEvidence,
  isOpenJobPreference,
  mergeJobPreference,
  normalizeRemoteRegions,
  normalizeWorkModes,
  seekerEvidenceHasSignal,
  shouldPassAllHarvestJobs
} from "#@/job-preference/utils";

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

  it("is closed when any work mode is selected", () => {
    expect(
      isOpenJobPreference({
        ...defaultJobPreference(),
        workModes: ["remote", "hybrid"]
      })
    ).toBe(false);
  });

  it("treats default empty remoteRegions as open and a set list as closed", () => {
    expect(isOpenJobPreference({ ...defaultJobPreference(), remoteRegions: [] })).toBe(true);
    expect(isOpenJobPreference({ ...defaultJobPreference(), remoteRegions: ["eu"] })).toBe(false);
    expect(isOpenJobPreference({ ...defaultJobPreference(), levelFloor: "senior" })).toBe(false);
  });
});

describe("normalizeRemoteRegions", () => {
  it("drops worldwide tokens and keeps remaining slugs", () => {
    expect(normalizeRemoteRegions(["worldwide", "mena"])).toEqual(["mena"]);
    expect(normalizeRemoteRegions(["worldwide"])).toEqual([]);
  });
});

describe("backfillRemoteRegionsFromLocations", () => {
  it("copies a non-worldwide location slug onto remoteRegions", () => {
    expect(backfillRemoteRegionsFromLocations(["egypt"]).remoteRegions).toContain("egypt");
  });
});

describe("normalizeWorkModes", () => {
  it("dedupes and preserves product order for multi-select", () => {
    expect(normalizeWorkModes(["onsite", "remote", "remote", "hybrid"])).toEqual([
      "remote",
      "hybrid",
      "onsite"
    ]);
  });

  it("returns empty when none selected", () => {
    expect(normalizeWorkModes([])).toEqual([]);
  });
});

describe("mergeJobPreference", () => {
  it("replaces workModes array on patch (including multi)", () => {
    const current = { ...defaultJobPreference(), workModes: ["remote" as const] };
    const merged = mergeJobPreference(current, {
      workModes: ["remote", "hybrid"],
      salaryCurrency: undefined
    });
    expect(merged.workModes).toEqual(["remote", "hybrid"]);
  });

  it("keeps current workModes when patch omits the field", () => {
    const current = {
      ...defaultJobPreference(),
      workModes: ["hybrid" as const, "onsite" as const]
    };
    const merged = mergeJobPreference(current, {
      minMatchScore: 70,
      salaryCurrency: undefined
    });
    expect(merged.workModes).toEqual(["hybrid", "onsite"]);
  });

  it("defaults new discovery fields", () => {
    const d = defaultJobPreference();
    expect(d.titleId).toBeNull();
    expect(d.customTitle).toBeNull();
    expect(d.jobsPerRun).toBe(25);
    expect(d.dailyBoardScoreCap).toBe(50);
    expect(d.importFromEmail).toBe(false);
    expect(d.reviewApplyKit).toBe(true);
  });

  it("merges importFromEmail when provided", () => {
    const merged = mergeJobPreference(defaultJobPreference(), {
      importFromEmail: true,
      salaryCurrency: undefined
    });
    expect(merged.importFromEmail).toBe(true);
  });

  it("merges reviewApplyKit when provided", () => {
    const merged = mergeJobPreference(defaultJobPreference(), {
      reviewApplyKit: false,
      salaryCurrency: undefined
    });
    expect(merged.reviewApplyKit).toBe(false);
  });

  it("merges dailyBoardScoreCap when provided", () => {
    const merged = mergeJobPreference(defaultJobPreference(), {
      dailyBoardScoreCap: 47,
      salaryCurrency: undefined
    });
    expect(merged.dailyBoardScoreCap).toBe(50);
  });
});

describe("UpsertJobPreferenceInputSchema facet validation", () => {
  it("rejects a bogus facet value", () => {
    expect(UpsertJobPreferenceInputSchema.safeParse({ seniority: ["bogus"] }).success).toBe(false);
    expect(UpsertJobPreferenceInputSchema.safeParse({ companySizes: ["10-20"] }).success).toBe(
      false
    );
  });

  it("accepts valid facet input", () => {
    expect(
      UpsertJobPreferenceInputSchema.safeParse({
        seniority: ["senior", "lead"],
        regions: ["eu", "mena"],
        collections: ["yc"],
        openWithinDays: 14,
        visaSponsorship: true
      }).success
    ).toBe(true);
  });
});

describe("mergeJobPreference facet semantics", () => {
  it("applies present facet fields and defaults the rest to unset", () => {
    const merged = mergeJobPreference(defaultJobPreference(), {
      seniority: ["senior"],
      visaSponsorship: false
    });
    expect(merged.seniority).toEqual(["senior"]);
    expect(merged.visaSponsorship).toBe(false);
    expect(merged.regions).toBeNull();
    expect(merged.openWithinDays).toBeNull();
  });

  it("keeps facet values from current and passes tri-state nulls through", () => {
    const current = mergeJobPreference(defaultJobPreference(), {
      regions: ["eu"],
      collections: ["yc"],
      requiresClearance: true
    });
    const patched = mergeJobPreference(current, {
      requiresClearance: null,
      openWithinDays: 7
    });
    expect(patched.regions).toEqual(["eu"]);
    expect(patched.collections).toEqual(["yc"]);
    expect(patched.requiresClearance).toBeNull();
    expect(patched.openWithinDays).toBe(7);
  });

  it("defaults all facets on first write with no patch", () => {
    const merged = mergeJobPreference(defaultJobPreference(), undefined);
    expect(merged.seniority).toBeNull();
    expect(merged.workModes).toEqual([]);
    expect(merged.minMatchScore).toBe(60);
  });
});

describe("seeker match evidence", () => {
  it("treats empty evidence as no signal", () => {
    expect(seekerEvidenceHasSignal(emptySeekerMatchEvidence())).toBe(false);
    expect(shouldPassAllHarvestJobs(defaultJobPreference())).toBe(true);
  });

  it("does not pass-all when the profile has stacks or titles", () => {
    const evidence = buildSeekerMatchEvidence({
      experiences: [{ title: "Frontend Engineer", organization: "Acme" }],
      stacks: [{ name: "React", isFeatured: true }],
      projects: [{ title: "Hub", stacks: [{ name: "TypeScript" }] }]
    });
    expect(evidence.featuredStackNames).toEqual(["React"]);
    expect(evidence.stackNames).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(shouldPassAllHarvestJobs(defaultJobPreference(), evidence)).toBe(false);
  });

  it("still pass-all when prefs are open and evidence is empty", () => {
    expect(shouldPassAllHarvestJobs(defaultJobPreference(), emptySeekerMatchEvidence())).toBe(true);
  });

  it("never pass-all when role keywords are set", () => {
    const evidence = buildSeekerMatchEvidence({
      stacks: [{ name: "React", isFeatured: true }]
    });
    expect(
      shouldPassAllHarvestJobs({ ...defaultJobPreference(), roleKeywords: ["frontend"] }, evidence)
    ).toBe(false);
  });
});
