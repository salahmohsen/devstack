import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import {
  lastAssistantMessageIsCompleteWithClientResumeTools,
  shouldAutoResumeHubChat
} from "./should-auto-resume-hub-chat";

function assistant(parts: UIMessage["parts"]): UIMessage {
  return { id: "a1", role: "assistant", parts } as UIMessage;
}

describe("lastAssistantMessageIsCompleteWithClientResumeTools", () => {
  it("returns false for text-only answers (capability questions)", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [assistant([{ type: "text", text: "I can help with stacks and CRM." }])]
      })
    ).toBe(false);
  });

  it("returns false when only server CRM tools completed (no providerExecuted)", () => {
    // Regression: bare lastAssistantMessageIsCompleteWithToolCalls was true here
    // and caused infinite re-submit after every multi-step server tool chain.
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            { type: "step-start" },
            {
              type: "tool-listOpenApplications",
              toolCallId: "t1",
              toolName: "listOpenApplications",
              state: "output-available",
              output: { applications: [] }
            } as never,
            { type: "text", text: "You have no open applications." }
          ])
        ]
      })
    ).toBe(false);
  });

  it("returns false while propose-from-jd is waiting for the user", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "t2",
              toolName: "propose-application-from-jd",
              state: "input-available",
              input: { title: "Eng", companyName: "Acme", description: "…" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("returns true after user completes propose-from-jd via addToolOutput", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "t2",
              toolName: "propose-application-from-jd",
              state: "output-available",
              output: { action: "save" }
            } as never
          ])
        ]
      })
    ).toBe(true);
  });

  it("ignores providerExecuted client-named tools (server already ran them)", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "t2",
              toolName: "propose-application-from-jd",
              state: "output-available",
              providerExecuted: true,
              output: { action: "dismiss" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("only looks at the last step", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "old",
              toolName: "propose-application-from-jd",
              state: "output-available",
              output: { action: "save" }
            } as never,
            { type: "step-start" },
            { type: "text", text: "Done." }
          ])
        ]
      })
    ).toBe(false);
  });
});

describe("shouldAutoResumeHubChat", () => {
  it("does not auto-resume after a plain capability answer", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [assistant([{ type: "text", text: "I coordinate stacks, mail, and CRM." }])]
      })
    ).toBe(false);
  });

  it("does not auto-resume after server tool multi-step finishes", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [
          assistant([
            {
              type: "tool-listExperiences",
              toolCallId: "e1",
              state: "output-available",
              output: { items: [] }
            } as never,
            { type: "text", text: "No experiences yet." }
          ])
        ]
      })
    ).toBe(false);
  });

  it("auto-resumes after propose card output", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [
          assistant([
            {
              type: "tool-proposeApplicationFromJd",
              toolCallId: "p1",
              toolName: "proposeApplicationFromJd",
              state: "output-available",
              output: { action: "package" }
            } as never
          ])
        ]
      })
    ).toBe(true);
  });
});
