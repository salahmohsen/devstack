import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { messagesForMastraMemoryChat } from "./messages-for-mastra-memory";

function msg(role: "user" | "assistant", id: string, text: string): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }]
  } as UIMessage;
}

describe("messagesForMastraMemoryChat", () => {
  it("sends only the latest user message on submit", () => {
    const messages = [
      msg("user", "u1", "hi"),
      msg("assistant", "a1", "hello"),
      msg("user", "u2", "what can you do?")
    ];
    const out = messagesForMastraMemoryChat(messages, "submit-message");
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("u2");
    expect(out[0]?.role).toBe("user");
  });

  it("sends only the last assistant message on tool/approval resume", () => {
    const assistant = {
      id: "a2",
      role: "assistant" as const,
      parts: [
        {
          type: "tool-propose-application-from-jd",
          toolCallId: "t1",
          state: "output-available",
          output: { action: "save" }
        }
      ]
    } as unknown as UIMessage;
    const messages = [msg("user", "u1", "paste jd"), assistant];
    const out = messagesForMastraMemoryChat(messages, "submit-message");
    expect(out).toEqual([assistant]);
  });

  it("on regenerate drops trailing assistant and keeps last user only", () => {
    const messages = [
      msg("user", "u1", "hi"),
      msg("assistant", "a1", "old"),
      msg("user", "u2", "again"),
      msg("assistant", "a2", "to regenerate")
    ];
    const out = messagesForMastraMemoryChat(messages, "regenerate-message");
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("u2");
  });

  it("expands hub-tool directive chips to everyday prompts for the model", () => {
    const messages = [msg("user", "u1", ":hub-tool[Job rules]{name=job-rules} please")];
    const out = messagesForMastraMemoryChat(messages, "submit-message");
    expect(out).toHaveLength(1);
    const text = (out[0]?.parts?.[0] as { text?: string })?.text;
    expect(text).toBe("show me my job rules please");
  });
});
