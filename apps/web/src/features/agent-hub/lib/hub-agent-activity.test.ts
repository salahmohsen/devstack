import { describe, expect, it } from "vitest";

import {
  buildHubAgentActivityItems,
  humanizeHubToolName,
  hubAgentActivityActiveLabel,
  hubAgentActivityStatus,
  isHubListingExtractActive,
  isHubWorkingStripToolName
} from "./hub-agent-activity";

describe("humanizeHubToolName — search-loop labels", () => {
  it.each([
    ["upsert-soft-job-preferences", "Updating job preferences"],
    ["upsertSoftJobPreferences", "Updating job preferences"],
    ["find-jobs-now", "Finding jobs"],
    ["get-search-brief", "Loading search brief"],
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
    expect(isHubWorkingStripToolName("propose-hard-preference-change")).toBe(false);
    expect(isHubWorkingStripToolName("find-jobs-now")).toBe(false);
    expect(isHubWorkingStripToolName("open-entity-form")).toBe(false);
    expect(isHubWorkingStripToolName("open-entity-inspect")).toBe(false);
    expect(isHubWorkingStripToolName("get-search-brief")).toBe(false);
  });

  it("includes extract and other server tools as working-strip steps", () => {
    expect(isHubWorkingStripToolName("jobPageExtractor")).toBe(true);
    expect(isHubWorkingStripToolName("fetch-job-page")).toBe(true);
    expect(isHubWorkingStripToolName("list-new-jobs")).toBe(true);
    expect(isHubWorkingStripToolName("upsert-soft-job-preferences")).toBe(true);
  });
});

describe("buildHubAgentActivityItems", () => {
  it("omits get-search-brief — File Diff is the thread surface", () => {
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
        id: "soft1",
        type: "step",
        label: "Updating job preferences",
        status: "complete"
      }
    ]);
  });

  it("maps extract + reasoning and skips the JD card tool", () => {
    const items = buildHubAgentActivityItems([
      { type: "reasoning", text: "Need the listing body first." },
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
      { id: "reasoning-0-0", type: "text", content: "Need the listing body first." },
      { id: "ex1", type: "step", label: "Reading listing", status: "complete" }
    ]);
  });

  it("splits streamed reasoning into text rows", () => {
    const items = buildHubAgentActivityItems([
      {
        type: "reasoning",
        text: "Reading the request.\nSeparating content from presentation."
      }
    ]);
    expect(items).toEqual([
      { id: "reasoning-0-0", type: "text", content: "Reading the request." },
      {
        id: "reasoning-0-1",
        type: "text",
        content: "Separating content from presentation."
      }
    ]);
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
