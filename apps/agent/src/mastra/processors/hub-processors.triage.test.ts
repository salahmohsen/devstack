import { describe, expect, it } from "vitest";

import { messagesNeedProposeTriage } from "./hub-processors";

function assistantWithParts(parts: Record<string, unknown>[]) {
  return {
    role: "assistant" as const,
    content: { parts }
  };
}

describe("messagesNeedProposeTriage", () => {
  it("is false when listNewJobs has not run", () => {
    expect(
      messagesNeedProposeTriage([
        { role: "user", content: { parts: [{ type: "text", text: "triage new jobs" }] } }
      ] as never)
    ).toBe(false);
  });

  it("is true after listNewJobs returns rows and propose has not run", () => {
    expect(
      messagesNeedProposeTriage([
        { role: "user", content: { parts: [{ type: "text", text: "triage new jobs" }] } },
        assistantWithParts([
          {
            type: "tool-list-new-jobs",
            toolName: "listNewJobs",
            state: "output-available",
            output: { jobs: [{ id: "j1", title: "Eng", companyName: "Acme" }] }
          }
        ])
      ] as never)
    ).toBe(true);
  });

  it("is false after propose-new-jobs-triage is called", () => {
    expect(
      messagesNeedProposeTriage([
        { role: "user", content: { parts: [{ type: "text", text: "triage new jobs" }] } },
        assistantWithParts([
          {
            type: "tool-list-new-jobs",
            toolName: "listNewJobs",
            state: "output-available",
            output: { jobs: [{ id: "j1" }] }
          },
          {
            type: "tool-propose-new-jobs-triage",
            toolName: "proposeNewJobsTriage",
            state: "input-available"
          }
        ])
      ] as never)
    ).toBe(false);
  });

  it("is false when listNewJobs is empty", () => {
    expect(
      messagesNeedProposeTriage([
        { role: "user", content: { parts: [{ type: "text", text: "triage new jobs" }] } },
        assistantWithParts([
          {
            type: "tool-list-new-jobs",
            toolName: "listNewJobs",
            state: "output-available",
            output: { jobs: [] }
          }
        ])
      ] as never)
    ).toBe(false);
  });
});
