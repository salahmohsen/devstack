import { describe, expect, it } from "vitest";

import {
  APPLY_PACKAGE_MIN_DESCRIPTION_CHARS,
  descriptionQualityLength,
  filterConfirmedTriageIds,
  filterHubJobUrlImportActiveTools,
  filterHubPostEvidenceConfirmActiveTools,
  filterHubTriageActiveTools,
  hubJobUrlImportFeedback,
  isJobListingUrl,
  isHubClientHitlToolName,
  meetsApplyPackageQualityGate,
  selectFocusJob,
  shouldStopHubLoopAfterClientHitl,
  type JobScoreRow
} from "./hub-superpowers-policy";

function job(partial: Partial<JobScoreRow> & { id: string }): JobScoreRow {
  return {
    title: partial.title ?? "Role",
    companyName: partial.companyName ?? "Co",
    matchScore: partial.matchScore ?? null,
    description: partial.description ?? "",
    ...partial
  };
}

describe("selectFocusJob — multi-variable stress", () => {
  it("returns null for empty list", () => {
    expect(selectFocusJob([])).toBeNull();
    expect(selectFocusJob([], "x")).toBeNull();
  });

  it("prefers named id when present", () => {
    const rows = [
      job({ id: "a", matchScore: 99 }),
      job({ id: "b", matchScore: 10 }),
      job({ id: "c", matchScore: 50 })
    ];
    expect(selectFocusJob(rows, "b")?.id).toBe("b");
  });

  it("falls back to max matchScore when name missing or unknown", () => {
    const rows = [
      job({ id: "a", matchScore: 40 }),
      job({ id: "b", matchScore: 90 }),
      job({ id: "c", matchScore: 70 })
    ];
    expect(selectFocusJob(rows)?.id).toBe("b");
    expect(selectFocusJob(rows, "nope")?.id).toBe("b");
    expect(selectFocusJob(rows, "  ")?.id).toBe("b");
  });

  it("handles all null scores, zeros, negatives, ties", () => {
    expect(selectFocusJob([job({ id: "a" }), job({ id: "b" }), job({ id: "c" })])?.id).toBe("a");

    expect(
      selectFocusJob([
        job({ id: "a", matchScore: 0 }),
        job({ id: "b", matchScore: 0 }),
        job({ id: "c", matchScore: -1 })
      ])?.id
    ).toBe("a");

    // first highest wins on tie
    expect(
      selectFocusJob([
        job({ id: "a", matchScore: 50 }),
        job({ id: "b", matchScore: 80 }),
        job({ id: "c", matchScore: 80 })
      ])?.id
    ).toBe("b");
  });

  it("stress: 50 jobs with mixed scores and optional name", () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      job({
        id: `job-${i}`,
        matchScore: i === 37 ? 100 : (i % 17) * 3,
        title: `Title ${i}`,
        companyName: `Company ${i % 5}`
      })
    );
    expect(selectFocusJob(rows)?.id).toBe("job-37");
    expect(selectFocusJob(rows, "job-12")?.id).toBe("job-12");
    expect(selectFocusJob(rows, "job-999")?.id).toBe("job-37");
  });
});

describe("meetsApplyPackageQualityGate — multi-variable stress", () => {
  it("rejects thin JD under threshold", () => {
    expect(
      meetsApplyPackageQualityGate({
        title: "Eng",
        companyName: "Acme",
        description: "short"
      })
    ).toBe(false);
  });

  it("accepts exactly at threshold", () => {
    const padding = "x".repeat(
      APPLY_PACKAGE_MIN_DESCRIPTION_CHARS - "Senior Eng".length - "Acme Corp".length
    );
    expect(
      meetsApplyPackageQualityGate({
        title: "Senior Eng",
        companyName: "Acme Corp",
        description: padding
      })
    ).toBe(true);
    expect(
      descriptionQualityLength({
        title: "Senior Eng",
        companyName: "Acme Corp",
        description: padding
      })
    ).toBe(APPLY_PACKAGE_MIN_DESCRIPTION_CHARS);
  });

  it("trims whitespace before measuring", () => {
    const body = "y".repeat(APPLY_PACKAGE_MIN_DESCRIPTION_CHARS);
    expect(
      meetsApplyPackageQualityGate({
        title: "  ",
        companyName: "  ",
        description: `  ${body}  `
      })
    ).toBe(true);
  });

  it("stress: length matrix around threshold", () => {
    for (const n of [0, 1, 50, 399, 400, 401, 1200, 50_000]) {
      const description = "d".repeat(n);
      const ok = meetsApplyPackageQualityGate({
        title: "",
        companyName: "",
        description
      });
      expect(ok).toBe(n >= APPLY_PACKAGE_MIN_DESCRIPTION_CHARS);
    }
  });
});

describe("filterConfirmedTriageIds — multi-variable stress", () => {
  it("drops ids not in proposed sets", () => {
    expect(
      filterConfirmedTriageIds({
        proposedTrackIds: ["t1", "t2"],
        proposedDismissIds: ["d1"],
        trackIds: ["t1", "evil"],
        dismissIds: ["d1", "t2"]
      })
    ).toEqual({ trackIds: ["t1"], dismissIds: ["d1"] });
  });

  it("handles empty cancel-like confirms", () => {
    expect(
      filterConfirmedTriageIds({
        proposedTrackIds: ["a"],
        proposedDismissIds: ["b"],
        trackIds: [],
        dismissIds: []
      })
    ).toEqual({ trackIds: [], dismissIds: [] });
  });

  it("stress: 30 proposed track/dismiss with random unchecks", () => {
    const proposedTrackIds = Array.from({ length: 30 }, (_, i) => `t${i}`);
    const proposedDismissIds = Array.from({ length: 30 }, (_, i) => `d${i}`);
    // uncheck even indices
    const trackIds = proposedTrackIds.filter((_, i) => i % 2 === 1);
    const dismissIds = proposedDismissIds.filter((_, i) => i % 3 === 0);
    const result = filterConfirmedTriageIds({
      proposedTrackIds,
      proposedDismissIds,
      trackIds: [...trackIds, "inject-track"],
      dismissIds: [...dismissIds, "inject-dismiss"]
    });
    expect(result.trackIds).toEqual(trackIds);
    expect(result.dismissIds).toEqual(dismissIds);
    expect(result.trackIds).not.toContain("inject-track");
    expect(result.dismissIds).not.toContain("inject-dismiss");
  });
});

describe("shouldStopHubLoopAfterClientHitl", () => {
  it.each([
    "proposeNewJobsTriage",
    "propose-new-jobs-triage",
    "propose-application-from-jd",
    "open-entity-form",
    "openEntityForm",
    "propose-evidence-change",
    "proposeEvidenceChange"
  ])("stops while %s is waiting", (name) => {
    expect(
      shouldStopHubLoopAfterClientHitl({
        toolCalls: [{ id: "c1", name }],
        toolResults: []
      })
    ).toBe(true);
  });

  it("does not stop after the card has a result", () => {
    expect(
      shouldStopHubLoopAfterClientHitl({
        toolCalls: [{ id: "c1", name: "proposeNewJobsTriage" }],
        toolResults: [{ id: "c1" }]
      })
    ).toBe(false);
  });

  it("does not stop on server CRM tools", () => {
    expect(isHubClientHitlToolName("trackJob")).toBe(false);
    expect(
      shouldStopHubLoopAfterClientHitl({
        toolCalls: [{ id: "c1", name: "listNewJobs" }],
        toolResults: []
      })
    ).toBe(false);
  });
});

const URL_IMPORT_TOOL_NAMES = [
  "getJobPreferences",
  "listNewJobs",
  "agent-jobPageExtractor",
  "proposeApplicationFromJd",
  "get-search-brief",
  "getSearchBrief",
  "upsert-soft-job-preferences",
  "upsertSoftJobPreferences",
  "find-jobs-now",
  "findJobsNow",
  "open-entity-form",
  "openEntityForm",
  "open-entity-inspect",
  "openEntityInspect",
  "propose-hard-preference-change",
  "proposeHardPreferenceChange",
  "propose-evidence-change",
  "proposeEvidenceChange"
] as const;

const URL_IMPORT_FORBIDDEN = [
  "get-search-brief",
  "getSearchBrief",
  "upsert-soft-job-preferences",
  "upsertSoftJobPreferences",
  "find-jobs-now",
  "findJobsNow",
  "open-entity-form",
  "openEntityForm",
  "open-entity-inspect",
  "openEntityInspect",
  "propose-evidence-change",
  "proposeEvidenceChange"
] as const;

describe("hub job URL import lock", () => {
  it("keeps only extract + propose before extract runs", () => {
    expect(filterHubJobUrlImportActiveTools(URL_IMPORT_TOOL_NAMES, false)).toEqual([
      "agent-jobPageExtractor",
      "proposeApplicationFromJd"
    ]);
  });

  it("keeps only propose after extract already ran", () => {
    expect(filterHubJobUrlImportActiveTools(URL_IMPORT_TOOL_NAMES, true)).toEqual([
      "proposeApplicationFromJd"
    ]);
  });

  it("cannot call get-search-brief / upsert / find-jobs-now / open-entity-form during import", () => {
    const before = filterHubJobUrlImportActiveTools(URL_IMPORT_TOOL_NAMES, false);
    const after = filterHubJobUrlImportActiveTools(URL_IMPORT_TOOL_NAMES, true);
    for (const name of URL_IMPORT_FORBIDDEN) {
      expect(before).not.toContain(name);
      expect(after).not.toContain(name);
    }
  });

  it("tells the model not to extract again once extract ran", () => {
    const after = hubJobUrlImportFeedback(true);
    expect(after).toMatch(/do not/i);
    expect(after).toMatch(/jobPageExtractor|fetch-job-page/i);
    expect(after).toMatch(/propose-application-from-jd/);
    expect(hubJobUrlImportFeedback(false)).not.toBe(after);
  });
});

describe("isJobListingUrl", () => {
  it("matches BrassRing / regional career portals", () => {
    expect(
      isJobListingUrl(
        "https://middleeastjobs.deloitte.com/careersME/PipelineDetail/Deloitte-Innovation-Hub-I-Senior-Frontend-Developer-Cairo-Egypt/257322"
      )
    ).toBe(true);
  });

  it("still matches LinkedIn and /jobs/ paths", () => {
    expect(isJobListingUrl("https://www.linkedin.com/jobs/view/123")).toBe(true);
    expect(isJobListingUrl("https://example.com/jobs/senior-engineer")).toBe(true);
  });

  it("rejects github and bare homepages", () => {
    expect(isJobListingUrl("https://github.com/acme/jobs")).toBe(false);
    expect(isJobListingUrl("https://deloitte.com/")).toBe(false);
  });
});

describe("hub triage lock", () => {
  it("keeps only propose-new-jobs-triage", () => {
    expect(
      filterHubTriageActiveTools(["listNewJobs", "proposeNewJobsTriage", "getJobPreferences"])
    ).toEqual(["proposeNewJobsTriage"]);
  });
});

describe("search-loop HITL stop matrix", () => {
  it.each([
    "propose-hard-preference-change",
    "proposeHardPreferenceChange",
    "find-jobs-now",
    "get-search-brief",
    "open-entity-form",
    "open-entity-inspect",
    "propose-evidence-change",
    "proposeEvidenceChange"
  ])("stops while %s is waiting", (name) => {
    expect(isHubClientHitlToolName(name)).toBe(true);
    expect(
      shouldStopHubLoopAfterClientHitl({
        toolCalls: [{ id: "c1", name }],
        toolResults: []
      })
    ).toBe(true);
  });

  it("does not stop after the hard-stop card has a result", () => {
    expect(
      shouldStopHubLoopAfterClientHitl({
        toolCalls: [{ id: "c1", name: "propose-hard-preference-change" }],
        toolResults: [{ id: "c1" }]
      })
    ).toBe(false);
  });

  it("does not treat soft upsert as client HITL", () => {
    expect(isHubClientHitlToolName("upsert-soft-job-preferences")).toBe(false);
    expect(isHubClientHitlToolName("upsertSoftJobPreferences")).toBe(false);
    expect(
      shouldStopHubLoopAfterClientHitl({
        toolCalls: [{ id: "c1", name: "upsert-soft-job-preferences" }],
        toolResults: []
      })
    ).toBe(false);
  });
});

describe("filterHubPostEvidenceConfirmActiveTools", () => {
  const toolNames = [
    "listNewJobs",
    "list-new-jobs",
    "proposeNewJobsTriage",
    "propose-new-jobs-triage",
    "findJobsNow",
    "find-jobs-now",
    "searchEvidence",
    "getProject",
    "getExperience",
    "getStack",
    "listProjects",
    "listExperiences",
    "listStacks",
    "proposeEvidenceChange",
    "propose-evidence-change",
    "openEntityInspect",
    "getSearchBrief"
  ] as const;

  it("drops listNewJobs, proposeNewJobsTriage, and findJobsNow in kebab and camel", () => {
    const kept = filterHubPostEvidenceConfirmActiveTools(toolNames);
    for (const name of [
      "listNewJobs",
      "list-new-jobs",
      "proposeNewJobsTriage",
      "propose-new-jobs-triage",
      "findJobsNow",
      "find-jobs-now"
    ]) {
      expect(kept).not.toContain(name);
    }
  });

  it("keeps search, get, list, propose-evidence, inspect, and brief tools", () => {
    expect(filterHubPostEvidenceConfirmActiveTools(toolNames)).toEqual([
      "searchEvidence",
      "getProject",
      "getExperience",
      "getStack",
      "listProjects",
      "listExperiences",
      "listStacks",
      "proposeEvidenceChange",
      "propose-evidence-change",
      "openEntityInspect",
      "getSearchBrief"
    ]);
  });
});
