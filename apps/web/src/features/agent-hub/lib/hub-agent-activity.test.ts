import { describe, expect, it } from "vitest";

import {
  buildHubAgentActivityItems,
  hubAgentActivityCollapseOnComplete,
  buildTodayLetterActivityItems,
  humanizeHubToolName,
  hubAgentActivityActiveLabel,
  hubAgentActivityStatus,
  isHubChoiceToolName,
  isHubListingExtractActive,
  isHubWorkingStripToolName
} from "./hub-agent-activity";

describe("humanizeHubToolName — search-loop labels", () => {
  it.each([
    ["upsert-soft-job-preferences", "Updating job preferences"],
    ["upsertSoftJobPreferences", "Updating job preferences"],
    ["propose-hard-preference-change", "Updating hard-stop preferences"],
    ["proposeHardPreferenceChange", "Updating hard-stop preferences"],
    ["find-jobs-now", "Finding jobs"],
    ["get-search-brief", "Loading search brief"],
    ["get-daily-brief", "Gathering today"],
    ["open-daily-brief", "Opening today"],
    ["classify-mail", "Reading that mail"],
    ["open-entity-form", "Opening experience form"],
    ["open-entity-inspect", "Opening project"]
  ] as const)("%s → %s", (name, label) => {
    expect(humanizeHubToolName(name)).toBe(label);
  });
});

describe("isHubWorkingStripToolName", () => {
  it("excludes HITL choice and approval tools", () => {
    expect(isHubWorkingStripToolName("propose-application-from-jd")).toBe(false);
    expect(isHubWorkingStripToolName("proposeNewJobsTriage")).toBe(false);
    expect(isHubWorkingStripToolName("open-surface")).toBe(false);
    expect(isHubWorkingStripToolName("open-entity-form")).toBe(false);
    expect(isHubWorkingStripToolName("openEntityForm")).toBe(false);
    expect(isHubWorkingStripToolName("generateApplyPackage")).toBe(false);
    expect(isHubWorkingStripToolName("create-application")).toBe(false);
    expect(isHubWorkingStripToolName("propose-hard-preference-change")).toBe(true);
    expect(isHubWorkingStripToolName("propose-evidence-change")).toBe(false);
    expect(isHubWorkingStripToolName("proposeEvidenceChange")).toBe(false);
    expect(isHubWorkingStripToolName("find-jobs-now")).toBe(false);
    expect(isHubWorkingStripToolName("open-entity-form")).toBe(false);
    expect(isHubWorkingStripToolName("open-entity-inspect")).toBe(true);
    expect(isHubWorkingStripToolName("get-search-brief")).toBe(true);
    expect(isHubChoiceToolName("open-entity-inspect")).toBe(false);
    expect(isHubChoiceToolName("get-search-brief")).toBe(false);
    expect(isHubWorkingStripToolName("get-daily-brief")).toBe(false);
    expect(isHubWorkingStripToolName("open-daily-brief")).toBe(false);
    expect(isHubWorkingStripToolName("propose-mail-crm-change")).toBe(false);
    expect(isHubWorkingStripToolName("propose-application-field-change")).toBe(false);
    expect(isHubWorkingStripToolName("proposeSetOutcome")).toBe(false);
    expect(isHubWorkingStripToolName("propose-delete-application")).toBe(false);
    expect(isHubWorkingStripToolName("classify-mail")).toBe(true);
  });

  it("includes extract and other server tools as working-strip steps", () => {
    expect(isHubWorkingStripToolName("jobPageExtractor")).toBe(true);
    expect(isHubWorkingStripToolName("fetch-job-page")).toBe(true);
    expect(isHubWorkingStripToolName("list-new-jobs")).toBe(true);
    expect(isHubWorkingStripToolName("upsert-soft-job-preferences")).toBe(true);
  });
});

describe("buildTodayLetterActivityItems", () => {
  it("plans gather then write while a Today ask is waiting", () => {
    expect(buildTodayLetterActivityItems({ parts: [], planWhileWaiting: true })).toEqual([
      { id: "today-gather", type: "step", label: "Gathering today", status: "active" },
      { id: "today-write", type: "step", label: "Writing today", status: "pending" }
    ]);
  });

  it("keeps gather active while getDailyBrief is in flight", () => {
    expect(
      buildTodayLetterActivityItems({
        parts: [
          {
            type: "tool-get-daily-brief",
            toolName: "getDailyBrief",
            toolCallId: "tb1",
            state: "call"
          }
        ],
        planWhileWaiting: true
      })
    ).toEqual([
      { id: "today-gather", type: "step", label: "Gathering today", status: "active" },
      { id: "today-write", type: "step", label: "Writing today", status: "pending" }
    ]);
  });

  it("completes both steps when the letter is back", () => {
    expect(
      buildTodayLetterActivityItems({
        parts: [
          {
            type: "tool-get-daily-brief",
            toolName: "getDailyBrief",
            toolCallId: "tb1",
            state: "output-available",
            output: { markdown: "# Monday\n\nNothing new right now." }
          }
        ],
        planWhileWaiting: false
      })
    ).toEqual([
      { id: "today-gather", type: "step", label: "Gathering today", status: "complete" },
      { id: "today-write", type: "step", label: "Writing today", status: "complete" }
    ]);
  });

  it("stays empty when this turn is not Today", () => {
    expect(buildTodayLetterActivityItems({ parts: [], planWhileWaiting: false })).toEqual([]);
  });
});

describe("buildHubAgentActivityItems", () => {
  it("puts inspect and search brief in the activity strip", () => {
    const items = buildHubAgentActivityItems([
      {
        type: "tool-open-entity-inspect",
        toolName: "open-entity-inspect",
        toolCallId: "ins1",
        state: "output-available",
        input: { kind: "experience", id: "e1" }
      },
      {
        type: "tool-get-search-brief",
        toolName: "get-search-brief",
        toolCallId: "br1",
        state: "output-available"
      }
    ]);
    expect(items).toEqual([
      {
        id: "ins1",
        type: "step",
        label: "Opening experience",
        status: "complete"
      },
      {
        id: "br1",
        type: "step",
        label: "Loading search brief",
        status: "complete"
      }
    ]);
  });

  it("includes hard-stop as a step so history is not empty after confirm", () => {
    const items = buildHubAgentActivityItems([
      {
        type: "tool-propose-hard-preference-change",
        toolName: "propose-hard-preference-change",
        toolCallId: "hard1",
        state: "output-available",
        output: { action: "confirm" }
      }
    ]);
    expect(items).toEqual([
      {
        id: "hard1",
        type: "step",
        label: "Updating hard-stop preferences",
        status: "complete"
      }
    ]);
  });

  it("omits propose-evidence-change — ApprovalCard is the thread surface", () => {
    const items = buildHubAgentActivityItems([
      {
        type: "tool-propose-evidence-change",
        toolName: "propose-evidence-change",
        toolCallId: "ev1",
        state: "input-available"
      },
      {
        type: "tool-upsert-soft-job-preferences",
        toolName: "upsert-soft-job-preferences",
        toolCallId: "soft1",
        state: "output-available"
      }
    ]);
    expect(items).toEqual([
      {
        id: "soft1",
        type: "step",
        label: "Updating job preferences",
        status: "complete"
      }
    ]);
  });

  it("keeps search brief in the strip next to other working steps", () => {
    const items = buildHubAgentActivityItems([
      {
        type: "tool-get-search-brief",
        toolName: "get-search-brief",
        toolCallId: "brief1",
        state: "call"
      },
      {
        type: "tool-upsert-soft-job-preferences",
        toolName: "upsert-soft-job-preferences",
        toolCallId: "soft1",
        state: "output-available"
      }
    ]);
    expect(items).toEqual([
      {
        id: "brief1",
        type: "step",
        label: "Loading search brief",
        status: "active"
      },
      {
        id: "soft1",
        type: "step",
        label: "Updating job preferences",
        status: "complete"
      }
    ]);
  });

  it("maps extract and skips reasoning plus the JD card tool", () => {
    const items = buildHubAgentActivityItems([
      { type: "reasoning", text: "Need the listing body first. Wait — maxSteps 16." },
      {
        type: "tool-jobPageExtractor",
        toolName: "jobPageExtractor",
        toolCallId: "ex1",
        state: "output-available"
      },
      {
        type: "tool-propose-application-from-jd",
        toolName: "propose-application-from-jd",
        toolCallId: "jd1",
        state: "input-available"
      }
    ]);
    expect(items).toEqual([
      { id: "ex1", type: "step", label: "Reading listing", status: "complete" }
    ]);
  });

  it("does not dump reasoning lines into the working strip", () => {
    const items = buildHubAgentActivityItems([
      {
        type: "reasoning",
        text: "Reading the request.\nSeparating content from presentation."
      }
    ]);
    expect(items).toEqual([]);
  });

  it("marks a running extract as an active step", () => {
    const parts = [
      {
        type: "tool-fetch-job-page",
        toolName: "fetch-job-page",
        toolCallId: "ex2",
        state: "call"
      }
    ];
    const items = buildHubAgentActivityItems(parts);
    expect(items[0]).toMatchObject({
      type: "step",
      label: "Reading listing",
      status: "active"
    });
    expect(isHubListingExtractActive(parts)).toBe(true);
    expect(hubAgentActivityStatus({ items, parts, isRunning: true })).toBe("working");
    expect(hubAgentActivityActiveLabel(items, parts)).toBe("Reading listing…");
  });

  it("omits specialist workers from the strip when the subagent list owns them", () => {
    const items = buildHubAgentActivityItems([
      {
        type: "tool-getJobPreferences",
        toolName: "getJobPreferences",
        toolCallId: "prefs1",
        state: "output-available"
      },
      {
        type: "tool-agent-mailClassifierAgent",
        toolName: "agent-mailClassifierAgent",
        toolCallId: "a1",
        state: "call"
      }
    ]);
    expect(items).toEqual([
      {
        id: "prefs1",
        type: "step",
        label: "Checking job preferences",
        status: "complete"
      }
    ]);
  });

  it("collapses extractor + fetch into one Reading listing step", () => {
    const items = buildHubAgentActivityItems([
      {
        type: "tool-getJobPreferences",
        toolName: "getJobPreferences",
        toolCallId: "prefs1",
        state: "output-available"
      },
      {
        type: "tool-agent-jobPageExtractor",
        toolName: "agent-jobPageExtractor",
        toolCallId: "ex1",
        state: "output-available"
      },
      {
        type: "tool-fetch-job-page",
        toolName: "fetch-job-page",
        toolCallId: "ex2",
        state: "call"
      }
    ]);
    expect(items).toEqual([
      {
        id: "prefs1",
        type: "step",
        label: "Checking job preferences",
        status: "complete"
      },
      { id: "ex1", type: "step", label: "Reading listing", status: "active" }
    ]);
  });
});

describe("hubAgentActivityCollapseOnComplete", () => {
  it("keeps the latest assistant strip open after tools complete", () => {
    expect(hubAgentActivityCollapseOnComplete(true)).toBe(false);
    expect(hubAgentActivityCollapseOnComplete(false)).toBe(true);
  });
});
