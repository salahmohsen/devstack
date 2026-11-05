import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { hubToolCallIsOnLastMessage, writeHubToolOutputs } from "./write-hub-tool-output";

function assistant(id: string, toolCallId: string, state: string, output?: unknown): UIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "tool-open-surface", toolCallId, state, output }]
  } as unknown as UIMessage;
}

describe("writeHubToolOutputs", () => {
  it("writes into an older message and reports the changed id", () => {
    const messages = [
      assistant("a1", "old", "input-available"),
      assistant("a2", "new", "input-available")
    ];
    const { messages: next, changedIds } = writeHubToolOutputs(messages, [
      { toolCallId: "old", output: { action: "cancel" } }
    ]);
    expect(changedIds).toEqual(["old"]);
    expect((next[0]!.parts[0] as { state: string }).state).toBe("output-available");
    expect(next[1]).toBe(messages[1]);
  });

  it("reports nothing and keeps identity when the part is missing or resolved", () => {
    const messages = [assistant("a1", "done", "output-available", { action: "confirm" })];
    const result = writeHubToolOutputs(messages, [
      { toolCallId: "done", output: { action: "cancel" } },
      { toolCallId: "ghost", output: {} }
    ]);
    expect(result.changedIds).toEqual([]);
    expect(result.messages).toBe(messages);
  });

  it("knows whether a call sits on the last message", () => {
    const messages = [
      assistant("a1", "old", "input-available"),
      assistant("a2", "new", "input-available")
    ];
    expect(hubToolCallIsOnLastMessage(messages, "new")).toBe(true);
    expect(hubToolCallIsOnLastMessage(messages, "old")).toBe(false);
  });
});
