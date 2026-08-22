import { describe, expect, it } from "vitest";

import { HUB_APPLICATION_MUST_LOAD_FEEDBACK } from "#@/mastra/lib/hub-superpowers-policy";

import {
  createHubInputProcessors,
  HubApplicationMentionProcessor,
  HubEnsureFinalResponseProcessor,
  hubSupervisorOnIterationComplete,
  messagesNeedGetApplication,
  shouldStopAfterStackCatalog,
  shouldStopAfterTodayLetter
} from "./hub-processors";

function assistantWithParts(parts: Record<string, unknown>[]) {
  return {
    role: "assistant" as const,
    content: { parts }
  };
}

function userText(text: string) {
  return { role: "user" as const, content: { parts: [{ type: "text", text }] } };
}

const MENTION = "Look at application {app-1}";
const FORCED_READ_TOOLS = {
  getApplication: {},
  "get-application": {},
  getDailyBrief: {},
  findJobsNow: {},
  listStacks: {},
  getSearchBrief: {}
};

describe("messagesNeedGetApplication", () => {
  it("is true on application {id} until a successful getApplication", () => {
    expect(messagesNeedGetApplication([userText(MENTION)] as never)).toBe(true);
    expect(
      messagesNeedGetApplication([
        userText(MENTION),
        assistantWithParts([{ type: "text", text: "Pulling that job now." }])
      ] as never)
    ).toBe(true);
  });

  it("is false after a successful getApplication this turn", () => {
    expect(
      messagesNeedGetApplication([
        userText(MENTION),
        assistantWithParts([
          {
            type: "tool-getApplication",
            toolName: "getApplication",
            state: "output-available",
            output: { found: true, application: { id: "app-1" } }
          }
        ])
      ] as never)
    ).toBe(false);
    expect(
      messagesNeedGetApplication([
        userText(MENTION),
        assistantWithParts([
          {
            type: "tool-get-application",
            toolName: "get-application",
            state: "output-available",
            output: { found: true, application: { id: "app-1" } }
          }
        ])
      ] as never)
    ).toBe(false);
  });

  it("does not treat Tool-not-found as a successful getApplication", () => {
    expect(
      messagesNeedGetApplication([
        userText(MENTION),
        assistantWithParts([
          {
            type: "tool-getApplication",
            toolName: "getApplication",
            state: "output-available",
            output:
              'Tool "getApplication" not found. Available tools: listStacks. Call tools by their exact name only.'
          }
        ])
      ] as never)
    ).toBe(true);
  });

  it("is false when the latest user turn has no application {id}", () => {
    expect(messagesNeedGetApplication([userText("what do you have today?")] as never)).toBe(false);
  });
});

describe("HubApplicationMentionProcessor", () => {
  const processor = new HubApplicationMentionProcessor();

  it("mention-only allowlists getApplication and not findJobsNow", async () => {
    const result = await processor.processInputStep({
      messages: [userText(MENTION)],
      tools: FORCED_READ_TOOLS,
      sendSignal: async () => {}
    } as never);
    expect(result).toEqual({
      toolChoice: "required",
      activeTools: ["getApplication", "get-application"]
    });
    expect((result as { activeTools: string[] }).activeTools).not.toContain("findJobsNow");
  });

  it("mention + Today concurrent includes both getApplication and getDailyBrief", async () => {
    const result = await processor.processInputStep({
      messages: [userText(`what do you have for me today? ${MENTION}`)],
      tools: FORCED_READ_TOOLS,
      sendSignal: async () => {}
    } as never);
    expect(result).toMatchObject({ toolChoice: "required" });
    const active = (result as { activeTools: string[] }).activeTools;
    expect(active).toContain("getApplication");
    expect(active).toContain("getDailyBrief");
    expect(active).not.toContain("findJobsNow");
  });

  it("returns early when this turn is not an application mention", async () => {
    const result = await processor.processInputStep({
      messages: [userText("what do you have for me today?")],
      tools: FORCED_READ_TOOLS,
      sendSignal: async () => {}
    } as never);
    expect(result).toBeUndefined();
  });

  it("registers after stacks/today/brief and before ensure-final-response", () => {
    const ids = createHubInputProcessors().map((item) => item.id);
    const mentionIdx = ids.indexOf("hub-application-mention");
    expect(mentionIdx).toBeGreaterThan(-1);
    expect(mentionIdx).toBeGreaterThan(ids.indexOf("hub-search-brief-gather"));
    expect(mentionIdx).toBeLessThan(ids.indexOf("ensure-final-response"));
  });
});

describe("HubEnsureFinalResponseProcessor mention exception", () => {
  const processor = new HubEnsureFinalResponseProcessor(16);

  it("does not set toolChoice none while mention gather is pending", async () => {
    const result = await processor.processInputStep({
      stepNumber: 15,
      messages: [userText(MENTION)],
      sendSignal: async () => {}
    } as never);
    expect(result).toBeUndefined();
  });

  it("still disables tools on the last step when mention is not pending", async () => {
    const result = await processor.processInputStep({
      stepNumber: 15,
      messages: [userText("hello")],
      sendSignal: async () => {}
    } as never);
    expect(result).toEqual({ toolChoice: "none" });
  });
});

describe("hubSupervisorOnIterationComplete application mention", () => {
  it("mention-only text-only first iteration continues with feedback", () => {
    expect(
      hubSupervisorOnIterationComplete({
        messages: [userText(MENTION)] as never,
        toolCalls: [],
        toolResults: [],
        text: "Pulling that job now.",
        iteration: 1,
        finishReason: "stop"
      })
    ).toEqual({
      continue: true,
      feedback: HUB_APPLICATION_MUST_LOAD_FEEDBACK
    });
  });

  it("stops after one force retry still text-only", () => {
    expect(
      hubSupervisorOnIterationComplete({
        messages: [userText(MENTION)] as never,
        toolCalls: [],
        toolResults: [],
        text: "Still loading the job.",
        iteration: 2,
        finishReason: "stop"
      })
    ).toEqual({ continue: false });
  });
});

describe("shouldStopAfterTodayLetter / shouldStopAfterStackCatalog with mention", () => {
  it("stays false while mention gather is pending after Today facts", () => {
    const messages = [
      userText(`what do you have for me today? ${MENTION}`),
      assistantWithParts([
        {
          type: "tool-get-daily-brief",
          toolName: "getDailyBrief",
          state: "output-available",
          output: {
            inboxCount: 0,
            mailCount: 1,
            trackedCount: 2,
            markdown: "# Monday\n\nNothing new right now."
          }
        }
      ])
    ] as never;
    expect(messagesNeedGetApplication(messages)).toBe(true);
    expect(shouldStopAfterTodayLetter(messages)).toBe(false);
  });

  it("stays false while mention gather is pending after stack catalog", () => {
    const messages = [
      userText(`filter all my stacks. ${MENTION}`),
      assistantWithParts([
        {
          type: "tool-listStacks",
          toolName: "listStacks",
          state: "output-available",
          output: { stacks: [{ id: "s1", name: "React" }] }
        },
        { type: "text", text: "Here is the filtered catalog." }
      ])
    ] as never;
    expect(messagesNeedGetApplication(messages)).toBe(true);
    expect(shouldStopAfterStackCatalog(messages)).toBe(false);
  });
});
