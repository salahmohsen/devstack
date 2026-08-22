import { describe, expect, it } from "vitest";

import {
  APPLY_PACKAGE_MIN_DESCRIPTION_CHARS,
  descriptionQualityLength,
  filterConfirmedTriageIds,
  filterHubJobUrlImportActiveTools,
  filterHubPostEvidenceConfirmActiveTools,
  filterHubPostTriageConfirmActiveTools,
  filterHubTriageActiveTools,
  filterHubUnionForcedReadActiveTools,
  hubJobUrlImportFeedback,
  isJobListingUrl,
  isHubClientHitlToolName,
  meetsApplyPackageQualityGate,
  selectFocusJob,
  shouldStopHubLoopAfterClientHitl,
  userTurnAsksCompanyStatus,
  userTurnAsksDailyBrief,
  userTurnAsksEntityInspect,
  userTurnAsksNewJobsTriage,
  userTurnAsksPileStatusOnly,
  userTurnAsksSearchBrief,
  userTurnRetriesDailyBrief,
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

describe("userTurnAsksDailyBrief", () => {
  it("catches everyday today asks", () => {
    expect(userTurnAsksDailyBrief("what do you have for me today?")).toBe(true);
    expect(userTurnAsksDailyBrief("what you have for me today")).toBe(true);
    expect(userTurnAsksDailyBrief("what we have today?")).toBe(true);
    expect(userTurnAsksDailyBrief("what do we have today")).toBe(true);
    expect(userTurnAsksDailyBrief("what's new today")).toBe(true);
    expect(userTurnAsksDailyBrief("what's up")).toBe(true);
    expect(userTurnAsksDailyBrief("whats up?")).toBe(true);
    expect(userTurnAsksDailyBrief("what is new today")).toBe(true);
    expect(userTurnAsksDailyBrief("what's up with Trivelta")).toBe(false);
    expect(userTurnAsksDailyBrief("catch me up")).toBe(true);
    expect(userTurnAsksDailyBrief("what's on my plate")).toBe(true);
    expect(
      userTurnAsksDailyBrief("don't give me a vibe check. what's actually on my plate today")
    ).toBe(true);
    expect(userTurnAsksDailyBrief("open mentech experience")).toBe(false);
    expect(userTurnAsksDailyBrief("I applied today to Trivelta")).toBe(false);
  });
});

describe("userTurnAsksCompanyStatus", () => {
  it("catches a named company plus mail/stage", () => {
    expect(userTurnAsksCompanyStatus("and trivelta? they email me or just quiet")).toBe(true);
    expect(userTurnAsksCompanyStatus("what's trivelta's stage")).toBe(true);
    expect(userTurnAsksCompanyStatus("what we have today?")).toBe(false);
    expect(userTurnAsksCompanyStatus("open mentech")).toBe(false);
    expect(
      userTurnAsksCompanyStatus(
        "ya3ni catch me up — what we have today? trivelta they write or just quiet. show mentech."
      )
    ).toBe(true);
  });
});

describe("userTurnAsksEntityInspect", () => {
  it("catches open/show and ignores Today", () => {
    expect(userTurnAsksEntityInspect("open mentech")).toBe(true);
    expect(userTurnAsksEntityInspect("show my latest company i worked for")).toBe(true);
    expect(userTurnAsksEntityInspect("what do you have for me today?")).toBe(false);
    expect(userTurnAsksEntityInspect("open the side panel")).toBe(false);
    expect(
      userTurnAsksEntityInspect(
        "ya3ni catch me up — what we have today? trivelta they write or just quiet. show mentech."
      )
    ).toBe(true);
  });
});

describe("userTurnAsksPileStatusOnly", () => {
  it("treats yes/no pile questions as status, not triage", () => {
    expect(userTurnAsksPileStatusOnly("pile empty or not")).toBe(true);
    expect(userTurnAsksPileStatusOnly("anything new in the pile")).toBe(true);
    expect(userTurnAsksNewJobsTriage("pile empty or not")).toBe(false);
    expect(userTurnAsksNewJobsTriage("triage the pile")).toBe(true);
    expect(userTurnAsksPileStatusOnly("triage the pile")).toBe(false);
  });
});

describe("userTurnRetriesDailyBrief", () => {
  it("catches try-again and open-the-panel follow-ups", () => {
    expect(userTurnRetriesDailyBrief("try to open the side panel")).toBe(true);
    expect(userTurnRetriesDailyBrief("try again")).toBe(true);
    expect(userTurnRetriesDailyBrief("open the panel")).toBe(true);
    expect(userTurnRetriesDailyBrief("you didn't make any thing")).toBe(true);
    expect(userTurnRetriesDailyBrief("still nothing")).toBe(true);
    expect(userTurnRetriesDailyBrief("what's Trivelta's stage")).toBe(false);
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
    "proposeEvidenceChange",
    "open-daily-brief",
    "propose-mail-crm-change"
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

  it("after confirm keeps only track and dismiss", () => {
    expect(
      filterHubPostTriageConfirmActiveTools([
        "listNewJobs",
        "proposeNewJobsTriage",
        "trackJob",
        "dismissJob",
        "getSearchBrief"
      ])
    ).toEqual(["trackJob", "dismissJob"]);
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

describe("filterHubUnionForcedReadActiveTools", () => {
  const toolNames = [
    "getDailyBrief",
    "listStacks",
    "getSearchBrief",
    "searchApplications",
    "searchMail",
    "openEntityInspect",
    "listExperiences",
    "findJobsNow",
    "listNewJobs",
    "getApplication"
  ];

  it("unions Today + stacks + brief so exclusive filters cannot orphan tools", () => {
    expect(
      filterHubUnionForcedReadActiveTools(toolNames, {
        today: true,
        stacks: true,
        searchBrief: true,
        company: false,
        inspect: false,
        application: false
      })
    ).toEqual(["getDailyBrief", "listStacks", "getSearchBrief"]);
  });

  it("mention-only allowlists getApplication and not findJobsNow", () => {
    expect(
      filterHubUnionForcedReadActiveTools(toolNames, {
        today: false,
        stacks: false,
        searchBrief: false,
        company: false,
        inspect: false,
        application: true
      })
    ).toEqual(["getApplication"]);
  });

  it("unions mention + Today so both getApplication and getDailyBrief stay available", () => {
    expect(
      filterHubUnionForcedReadActiveTools(toolNames, {
        today: true,
        stacks: false,
        searchBrief: false,
        company: false,
        inspect: false,
        application: true
      })
    ).toEqual(["getDailyBrief", "getApplication"]);
  });

  it("returns empty when no forced reads are pending", () => {
    expect(
      filterHubUnionForcedReadActiveTools(toolNames, {
        today: false,
        stacks: false,
        searchBrief: false,
        company: false,
        inspect: false,
        application: false
      })
    ).toEqual([]);
  });
});

describe("userTurnAsksSearchBrief", () => {
  it("matches everyday job-rules wording", () => {
    expect(userTurnAsksSearchBrief("what am I looking for?")).toBe(true);
    expect(userTurnAsksSearchBrief("what I'm looking for job-wise")).toBe(true);
    expect(userTurnAsksSearchBrief("what are my job rules?")).toBe(true);
    expect(userTurnAsksSearchBrief("looking for in jobs")).toBe(true);
    expect(userTurnAsksSearchBrief("show me the brief")).toBe(true);
    expect(userTurnAsksSearchBrief("what do you have today?")).toBe(false);
    expect(userTurnAsksSearchBrief("open mentech")).toBe(false);
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
