import { describe, expect, it } from "vitest";

import {
  buildHubAgentActivityItems,
  hubAgentActivityActiveLabel,
  hubAgentActivityStatus,
  isHubListingExtractActive,
  isHubWorkingStripToolName
} from "./hub-agent-activity";

describe("isHubWorkingStripToolName", () => {
  it("excludes HITL choice and approval tools", () => {
    expect(isHubWorkingStripToolName("propose-application-from-jd")).toBe(false);
    expect(isHubWorkingStripToolName("proposeNewJobsTriage")).toBe(false);
    expect(isHubWorkingStripToolName("open-surface")).toBe(false);
    expect(isHubWorkingStripToolName("generateApplyPackage")).toBe(false);
    expect(isHubWorkingStripToolName("create-application")).toBe(false);
  });

  it("includes extract and other server tools as working-strip steps", () => {
    expect(isHubWorkingStripToolName("jobPageExtractor")).toBe(true);
    expect(isHubWorkingStripToolName("fetch-job-page")).toBe(true);
    expect(isHubWorkingStripToolName("list-new-jobs")).toBe(true);
  });
});

describe("buildHubAgentActivityItems", () => {
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
});
