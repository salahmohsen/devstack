import { describe, expect, it } from "vitest";

import { messagesNeedProposeTriage, messagesNeedSearchBriefAnswer } from "./hub-processors";

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

function searchBriefAfterUser(text: string, extraParts: Record<string, unknown>[] = []) {
  return [
    { role: "user", content: { parts: [{ type: "text", text }] } },
    assistantWithParts([
      {
        type: "tool-get-search-brief",
        toolName: "getSearchBrief",
        state: "output-available",
        output: { markdown: "## Target jobs", rebuilt: true }
      },
      ...extraParts
    ])
  ] as never;
}

describe("messagesNeedSearchBriefAnswer", () => {
  it("is true after get-search-brief on a section question with no spoken answer", () => {
    expect(messagesNeedSearchBriefAnswer(searchBriefAfterUser("where is the intro?"))).toBe(true);
    expect(messagesNeedSearchBriefAnswer(searchBriefAfterUser("where is the intro part?"))).toBe(
      true
    );
  });

  it("is false after get-search-brief on an identity / rules turn", () => {
    expect(messagesNeedSearchBriefAnswer(searchBriefAfterUser("what am I looking for?"))).toBe(
      false
    );
    expect(messagesNeedSearchBriefAnswer(searchBriefAfterUser("show my brief"))).toBe(false);
    expect(messagesNeedSearchBriefAnswer(searchBriefAfterUser("what are my job rules?"))).toBe(
      false
    );
  });

  it("is false once a text answer follows the brief", () => {
    expect(
      messagesNeedSearchBriefAnswer(
        searchBriefAfterUser("where is the intro part?", [
          { type: "text", text: "The intro was removed in the last rewrite." }
        ])
      )
    ).toBe(false);
  });
});
