import { describe, expect, it } from "vitest";

import {
  createHubInputProcessors,
  mastraMessagesHavePendingClientHitl,
  messagesNeedCompanyRead,
  messagesNeedDailyBriefFacts,
  messagesNeedDailyBriefOpen,
  messagesNeedEntityInspect,
  messagesNeedProposeTriage,
  messagesNeedSearchBriefAnswer,
  messagesNeedTriageWrites
} from "./hub-processors";

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

  it("is false on a yes/no pile question even when listNewJobs has rows", () => {
    expect(
      messagesNeedProposeTriage([
        { role: "user", content: { parts: [{ type: "text", text: "pile empty or not" }] } },
        assistantWithParts([
          {
            type: "tool-list-new-jobs",
            toolName: "listNewJobs",
            state: "output-available",
            output: { jobs: [{ id: "j1", title: "Eng", companyName: "Acme" }] }
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

describe("messagesNeedTriageWrites", () => {
  it("is false before confirm", () => {
    expect(
      messagesNeedTriageWrites([
        { role: "user", content: { parts: [{ type: "text", text: "show my new jobs" }] } },
        assistantWithParts([
          {
            type: "tool-propose-new-jobs-triage",
            toolName: "proposeNewJobsTriage",
            state: "input-available"
          }
        ])
      ] as never)
    ).toBe(false);
  });

  it("is true after confirm with outstanding ids", () => {
    expect(
      messagesNeedTriageWrites([
        { role: "user", content: { parts: [{ type: "text", text: "show my new jobs" }] } },
        assistantWithParts([
          {
            type: "tool-propose-new-jobs-triage",
            toolName: "proposeNewJobsTriage",
            state: "output-available",
            output: { action: "confirm", trackIds: ["a", "b"], dismissIds: ["c"] }
          }
        ])
      ] as never)
    ).toBe(true);
  });

  it("is false after cancel", () => {
    expect(
      messagesNeedTriageWrites([
        { role: "user", content: { parts: [{ type: "text", text: "show my new jobs" }] } },
        assistantWithParts([
          {
            type: "tool-propose-new-jobs-triage",
            toolName: "proposeNewJobsTriage",
            state: "output-available",
            output: { action: "cancel", trackIds: [], dismissIds: [] }
          }
        ])
      ] as never)
    ).toBe(false);
  });

  it("is false once every confirmed id was written", () => {
    expect(
      messagesNeedTriageWrites([
        { role: "user", content: { parts: [{ type: "text", text: "show my new jobs" }] } },
        assistantWithParts([
          {
            type: "tool-propose-new-jobs-triage",
            toolName: "proposeNewJobsTriage",
            state: "output-available",
            output: { action: "confirm", trackIds: ["a"], dismissIds: ["c"] }
          },
          {
            type: "tool-track-job",
            toolName: "trackJob",
            state: "output-available",
            input: { applicationId: "a" },
            output: { ok: true, applicationId: "a" }
          },
          {
            type: "tool-dismiss-job",
            toolName: "dismissJob",
            state: "output-available",
            input: { applicationId: "c" },
            output: { ok: true, applicationId: "c" }
          }
        ])
      ] as never)
    ).toBe(false);
  });

  it("does not treat a later user turn as still needing writes", () => {
    expect(
      messagesNeedTriageWrites([
        { role: "user", content: { parts: [{ type: "text", text: "show my new jobs" }] } },
        assistantWithParts([
          {
            type: "tool-propose-new-jobs-triage",
            toolName: "proposeNewJobsTriage",
            state: "output-available",
            output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
          }
        ]),
        { role: "user", content: { parts: [{ type: "text", text: "what am I looking for" }] } }
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

describe("messagesNeedDailyBrief", () => {
  it("needs facts on a Today ask before getDailyBrief", () => {
    expect(
      messagesNeedDailyBriefFacts([
        { role: "user", content: { parts: [{ type: "text", text: "what you have for me today" }] } }
      ] as never)
    ).toBe(true);
    expect(
      messagesNeedDailyBriefOpen([
        { role: "user", content: { parts: [{ type: "text", text: "what you have for me today" }] } }
      ] as never)
    ).toBe(false);
  });

  it("needs open after facts land", () => {
    const messages = [
      { role: "user", content: { parts: [{ type: "text", text: "catch me up" }] } },
      assistantWithParts([
        {
          type: "tool-get-daily-brief",
          toolName: "getDailyBrief",
          state: "output-available",
          output: { inboxCount: 0, mailCount: 1, trackedCount: 2 }
        }
      ])
    ] as never;
    expect(messagesNeedDailyBriefFacts(messages)).toBe(false);
    expect(messagesNeedDailyBriefOpen(messages)).toBe(true);
  });

  it("treats try-again after a Today ask as still Today", () => {
    expect(
      messagesNeedDailyBriefFacts([
        {
          role: "user",
          content: { parts: [{ type: "text", text: "what do you have for me today?" }] }
        },
        assistantWithParts([{ type: "text", text: "Building today's briefing now." }]),
        { role: "user", content: { parts: [{ type: "text", text: "try to open the side panel" }] } }
      ] as never)
    ).toBe(true);
  });

  it("treats 'what we have today' and 'you didn't make any thing' as Today", () => {
    expect(
      messagesNeedDailyBriefFacts([
        { role: "user", content: { parts: [{ type: "text", text: "what we have today?" }] } }
      ] as never)
    ).toBe(true);
    expect(
      messagesNeedDailyBriefFacts([
        { role: "user", content: { parts: [{ type: "text", text: "what we have today?" }] } },
        assistantWithParts([{ type: "text", text: "Pulling today's facts:" }]),
        { role: "user", content: { parts: [{ type: "text", text: "you didn't make any thing" }] } }
      ] as never)
    ).toBe(true);
    expect(
      messagesNeedDailyBriefFacts([
        { role: "user", content: { parts: [{ type: "text", text: "what we have today?" }] } },
        assistantWithParts([{ type: "text", text: "Pulling today's facts:" }]),
        { role: "user", content: { parts: [{ type: "text", text: "you didn't make any thing" }] } },
        assistantWithParts([
          { type: "text", text: "You're right — actually pulling the brief now:" }
        ]),
        { role: "user", content: { parts: [{ type: "text", text: "still nothing" }] } }
      ] as never)
    ).toBe(true);
  });

  it("still inspects and reads CRM on a packed Today ask after the letter is open", () => {
    const packed =
      "ya3ni catch me up — what we have today? trivelta they write or just quiet. show mentech.";
    const afterOpen = [
      { role: "user", content: { parts: [{ type: "text", text: packed }] } },
      assistantWithParts([
        {
          type: "tool-get-daily-brief",
          toolName: "getDailyBrief",
          state: "output-available",
          output: { inboxCount: 1, mailCount: 8, trackedCount: 13 }
        },
        {
          type: "tool-open-daily-brief",
          toolName: "openDailyBrief",
          state: "output-available",
          output: { opened: true, markdown: "# Today\n\nHello there today letter body." }
        }
      ])
    ] as never;
    expect(messagesNeedDailyBriefFacts(afterOpen)).toBe(false);
    expect(messagesNeedDailyBriefOpen(afterOpen)).toBe(false);
    expect(messagesNeedCompanyRead(afterOpen)).toBe(true);
    expect(messagesNeedEntityInspect(afterOpen)).toBe(true);
  });

  it("needs inspect when they said open and the tool has not run", () => {
    expect(
      messagesNeedEntityInspect([
        { role: "user", content: { parts: [{ type: "text", text: "open mentech" }] } },
        assistantWithParts([{ type: "text", text: "Opening Ment'ech:" }])
      ] as never)
    ).toBe(true);
  });

  it("does not need inspect after openEntityInspect", () => {
    expect(
      messagesNeedEntityInspect([
        { role: "user", content: { parts: [{ type: "text", text: "open mentech" }] } },
        assistantWithParts([
          {
            type: "tool-open-entity-inspect",
            toolName: "openEntityInspect",
            state: "input-available",
            input: { kind: "experience", id: "exp-1" }
          }
        ])
      ] as never)
    ).toBe(false);
  });

  it("registers hub-today before job-url import", () => {
    const ids = createHubInputProcessors().map((processor) => processor.id);
    expect(ids.indexOf("hub-today")).toBeGreaterThan(-1);
    expect(ids.indexOf("hub-today")).toBeLessThan(ids.indexOf("hub-job-url-import"));
  });
});

describe("mastraMessagesHavePendingClientHitl", () => {
  it("ignores leftover inspect from a previous user turn", () => {
    expect(
      mastraMessagesHavePendingClientHitl([
        { role: "user", content: { parts: [{ type: "text", text: "show mentech" }] } },
        assistantWithParts([
          {
            type: "tool-open-entity-inspect",
            toolName: "openEntityInspect",
            state: "input-available",
            input: { kind: "experience", id: "exp-1" }
          }
        ]),
        {
          role: "user",
          content: { parts: [{ type: "text", text: "what do you have for me today?" }] }
        }
      ] as never)
    ).toBe(false);
  });

  it("still sees a waiting Confirm on this turn", () => {
    expect(
      mastraMessagesHavePendingClientHitl([
        { role: "user", content: { parts: [{ type: "text", text: "track these" }] } },
        assistantWithParts([
          {
            type: "tool-propose-new-jobs-triage",
            toolName: "proposeNewJobsTriage",
            state: "input-available"
          }
        ])
      ] as never)
    ).toBe(true);
  });
});
