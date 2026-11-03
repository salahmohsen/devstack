import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { createHubResumeBudget } from "./hub-resume-budget";

function user(id: string): UIMessage {
  return { id, role: "user", parts: [{ type: "text", text: "hi" }] };
}

function assistant(calls: Array<[string, string]>): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: calls.map(([toolCallId, state]) => {
      return { type: "tool-open-surface", toolCallId, state };
    })
  } as unknown as UIMessage;
}

describe("createHubResumeBudget", () => {
  it("blocks a resume when the same resolved call already drove one", () => {
    const budget = createHubResumeBudget();
    const messages = [user("u1"), assistant([["c1", "output-available"]])];
    expect(budget.tryConsume(messages)).toBe(true);
    expect(budget.tryConsume(messages)).toBe(false);
  });

  it("allows a different client tool, up to the budget", () => {
    const budget = createHubResumeBudget(3);
    const results = ["c1", "c2", "c3", "c4"].map((id) =>
      budget.tryConsume([user("u1"), assistant([[id, "output-available"]])])
    );
    expect(results).toEqual([true, true, true, false]);
  });

  it("restores the budget on a new user message", () => {
    const budget = createHubResumeBudget(1);
    expect(budget.tryConsume([user("u1"), assistant([["c1", "output-available"]])])).toBe(true);
    expect(budget.tryConsume([user("u1"), assistant([["c2", "output-available"]])])).toBe(false);
    expect(budget.tryConsume([user("u2"), assistant([["c1", "output-available"]])])).toBe(true);
  });

  it("counts approval responses and ignores unresolved calls", () => {
    const budget = createHubResumeBudget();
    const messages = [
      user("u1"),
      assistant([
        ["c1", "approval-responded"],
        ["c2", "input-available"]
      ])
    ];
    expect(budget.tryConsume(messages)).toBe(true);
    expect(budget.tryConsume(messages)).toBe(false);
  });

  it("reset clears the state", () => {
    const budget = createHubResumeBudget(1);
    const messages = [user("u1"), assistant([["c1", "output-available"]])];
    expect(budget.tryConsume(messages)).toBe(true);
    budget.reset();
    expect(budget.tryConsume(messages)).toBe(true);
  });
});
