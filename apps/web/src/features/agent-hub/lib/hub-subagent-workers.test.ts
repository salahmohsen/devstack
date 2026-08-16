import { describe, expect, it } from "vitest";

import {
  buildHubSubagentListModel,
  hubSubagentListShouldShow,
  isHubSubagentWorkerName
} from "./hub-subagent-workers";

describe("isHubSubagentWorkerName", () => {
  it("treats supervisor specialists and workflows as workers", () => {
    expect(isHubSubagentWorkerName("agent-stackCategorizerAgent")).toBe(true);
    expect(isHubSubagentWorkerName("workflow-detectStacksWorkflow")).toBe(true);
    expect(isHubSubagentWorkerName("jobPageExtractor")).toBe(true);
  });

  it("ignores fetch-job-page and regular tools", () => {
    expect(isHubSubagentWorkerName("fetch-job-page")).toBe(false);
    expect(isHubSubagentWorkerName("getJobPreferences")).toBe(false);
  });
});

describe("hubSubagentListShouldShow", () => {
  it("hides a lone listing extract", () => {
    expect(
      hubSubagentListShouldShow([
        {
          type: "tool-agent-jobPageExtractor",
          toolName: "agent-jobPageExtractor",
          toolCallId: "ex1",
          state: "call"
        }
      ])
    ).toBe(false);
  });

  it("shows two specialists running in parallel", () => {
    const parts = [
      {
        type: "tool-agent-mailClassifierAgent",
        toolName: "agent-mailClassifierAgent",
        toolCallId: "a",
        state: "output-available"
      },
      {
        type: "tool-agent-jobNotifierMailExtractor",
        toolName: "agent-jobNotifierMailExtractor",
        toolCallId: "b",
        state: "call"
      }
    ];
    expect(hubSubagentListShouldShow(parts)).toBe(true);
    const model = buildHubSubagentListModel(parts, { modelLabel: "sonnet", isRunning: true });
    expect(model).not.toBeNull();
    expect(model?.agents).toHaveLength(2);
    expect(model?.completedCount).toBe(1);
    expect(model?.agents[0]?.name).toBe("Mail classifier");
    expect(model?.showSummary).toBe(false);
  });
});
